# Image pipeline

Local imports, remote build-time URLs, and CMS uploads share one responsive-width planner and the same serializable `OptimizedImageDescriptor`. Static builds use Sharp; browser CMS uploads use a local jSquash Web Worker. Rendering uses native `<picture>` markup without `next/image`.

The descriptor mirrors native markup: `sources` contains optional preferred formats and `img` contains the required final `<img>`. For raster images, AVIF is normally a `<source>` and WebP is the `img`; the browser chooses the first format it supports. SVG uses only `img.src`.

## Static image

`StaticImage` accepts either a Turbopack static import or an absolute remote/data URL. It can be imported directly by Server and Client Components, and `sizes` remains at the JSX call site.

```tsx
import { StaticImage } from "cstd-next/media/image/static-image.jsx";
import hero from "./hero.jpg";

<StaticImage alt="Local hero" loading="eager" sizes="(max-width: 1200px) 100vw, 1200px" src={hero} />;
<StaticImage alt="Remote hero" loading="lazy" sizes="100vw" src="https://example.com/hero.jpg" />;
```

The `sizes` prop is the only candidate-width API; image import queries and manual `widths` lists are unsupported. The planner supports `px`/`vw` source sizes with `min-width`/`max-width` conditions expressed in `px`. Unsupported CSS fails the build instead of silently producing an incomplete `srcset`.

Turbopack caches local source bytes. In `next dev`, the local loader emits one WebP browser asset and remote images use their original URLs. Development and production output namespaces are separate.

The local loader also emits a sanitized SVG or WebP runtime fallback. Dynamically rendered production routes use that immutable build artifact because they have no static RSC manifest; prerendered routes still receive the full sizes-aware AVIF/WebP descriptor.

A production static prerender fetches remote URLs, runs Sharp, and writes AVIF/WebP assets under `public/_cstd/image`. Generated filenames come from the decoded URL pathname; data URLs derive a filename from their media type. Changing the URL or remote bytes requires another build. Production Workers never download sources or mutate deployment assets.

Remote sources are conditionally revalidated on every build with `ETag` and `Last-Modified`. A `304` reuses cached bytes; a `200` replaces them. Servers without validators are fetched again.

SVG is sanitized before publication in development and production. Scripts, event handlers, embedded HTML, animation mutation, and external resources are removed; same-document fragments such as `url(#gradient)` remain supported. SVGO runs after sanitization in production.

Authenticated Google Drive images use the server-only `GoogleDriveRemoteStaticImage` wrapper.

## RSC delivery

During server prerendering, `StaticImage` suspends while fetch/Sharp/filesystem work completes and records a descriptor. The Turbopack page loader automatically injects a zero-DOM manifest seed into every page. After the single `next build`, the finalizer injects each route's descriptors into its existing HTML and leaf Flight payload.

Client navigation therefore receives descriptors with the normal RSC response: no second build, page wrapper, descriptor request, or application JSON endpoint. The browser runtime computes the request key synchronously and performs a synchronous manifest lookup; Sharp, filesystem, fetch, Node crypto, Promises, React `use`, and Suspense are absent from that browser path.

The page transform and RSC finalizer are intentionally pinned to the exact supported Next version and fail `next build` when the internal contract changes.

The application runs `cstd-next-clean-images` before `next build`. It removes production assets and temporary descriptors while preserving development assets. The application build must not use a Turbo result cache because remote URL content is an external input that must be revalidated.

## Markdown

`MarkdownRenderer` requires an explicit `imageSizes` prop because Markdown does not contain enough layout information to infer responsive slot sizes:

```tsx
<MarkdownRenderer imageSizes="(max-width: 768px) 100vw, 768px">{markdown}</MarkdownRenderer>
```

## CMS upload

`optimizeImage` can be imported by a Client Component. It encodes locally in the browser, performs no server request or hidden storage write, and returns a CMS-ready descriptor plus every object that must be uploaded:

```ts
const [artifact, error] = await optimizeImage(file, {
	baseURL: "/media",
	outputPathPrefix: "media",
	sizes: "(max-width: 1200px) 100vw, 1200px",
});

if (error !== null) {
	setError(error.message);
	return;
}

await Promise.all(
	artifact.files.map(({ data, key, type }) => bucket.put(key, data, { httpMetadata: { contentType: type } })),
);
await cms.images.save(artifact.descriptor);
```

Render the persisted descriptor with `<OptimizedImage src={descriptor} ... />`.

The browser worker derives candidate widths from `sizes` and emits AVIF and WebP `Blob`s. There is no input MIME or extension allowlist: every file the current browser can decode is rasterized, including mislabeled files, while unavailable codecs return an `ErrorReturn`. Animated inputs become one still frame. Browser upload processing is capped at 2560 pixels on the longest edge to bound its canvas/WASM memory after the browser decodes the source; build-time static images keep the full Sharp pipeline, including sanitized SVG and animated-image handling.
