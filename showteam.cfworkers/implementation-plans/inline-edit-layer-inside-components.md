# Move the inline edit layer inside the rendered components

Status: proposed
Scope: `apps/web`
Author: agent plan, 2026-09-06

## Goal

Today the edit layer is a set of wrapper components that *replace* content:
`<Badge><EditableText field="heroBadge" /></Badge>` renders a bare `<input>` in
edit mode, styled by hand-written CSS that fakes the host's typography.

Target: the element that already renders the content becomes the editor itself.
No element swap, no substitute styling, no layout shift between view and edit
mode.

## Hard constraint

`apps/web/src/components/ui/*` is vendored shadcn (`base-vega`, Base UI). Per
`AGENTS.md` those files may only be produced by `pnpm shadcn:add`; the JSX tree
and every `className` must stay byte-for-byte identical, and only props-level
edits (event handlers, a11y labels, domain data) are permitted.

Therefore: **no file under `src/components/ui/` is touched by this plan.** The
edit layer is injected entirely through props and through Base UI's `render`
seam, which every one of these components already exposes
(`src/components/ui/badge.tsx:28` — `useRender.ComponentProps<"span">`).

## Design

### The `Editable` component

One client component replaces `EditableText`. It takes the element that should
render the content and clones it with editing props.

```tsx
// src/components/editor/editable.tsx
"use client";

export function Editable({
  field,
  render = <span />,
  multiline = false,
}: {
  field: string;
  render?: React.ReactElement;
  multiline?: boolean;
}) {
  const content = useContext(PageContentContext);
  const value = content?.values[field] ?? "";

  if (!content?.editing) {
    return cloneElement(render, {}, value);
  }

  return cloneElement(
    render,
    {
      key: `${field}:${content.generation}`,
      contentEditable: "plaintext-only",
      suppressContentEditableWarning: true,
      "aria-label": `Edytuj: ${field}`,
      "aria-multiline": multiline || undefined,
      "data-editable-field": field,
      onKeyDown: multiline ? undefined : blockEnter,
      onBlur: (event) => content.update(field, event.currentTarget.textContent ?? ""),
    },
    value,
  );
}
```

Call sites:

| before | after |
| --- | --- |
| `<Badge><EditableText field="heroBadge" /></Badge>` | `<Editable field="heroBadge" render={<Badge />} />` |
| `<h1 className="…"><EditableText field="title" multiline /></h1>` | `<Editable field="title" multiline render={<h1 className="…" />} />` |
| `<span className="text-orange-500"><EditableText field="heroTitleAccent" /></span>` | `<Editable field="heroTitleAccent" render={<span className="text-orange-500" />} />` |
| bare text with no host element | `<Editable field="x" />` (defaults to `<span>`) |

Why this shape:

- **Props-only.** `Badge` forwards unknown props onto its `<span>` via
  `mergeProps`, so `contentEditable`/`onBlur` land on the real badge element and
  `badgeVariants(...)` classes are untouched. Legal for every registry
  component and survives the next `shadcn:add`.
- **Pages stay RSC.** `Editable` is a client component; React elements are valid
  RSC props, so a server page can pass `render={<h1 className="…" />}` across
  the boundary. Only the `render` element's own props must be serializable —
  none of the current call sites pass handlers.
- **The styled element is the editor.** The `<h1>` with its `clamp()` sizing is
  what you type into, so `.inline-page-content` (`src/app/globals.css:117-142`)
  and its font/line-height/letter-spacing/text-transform `inherit` hacks are
  deleted, along with the `multiline` textarea branch.
- **No layout shift** between modes; edit mode no longer changes the box model.

### Edit affordance

The dashed-orange outline currently comes from `.inline-page-content`. Replace
it with one attribute-keyed rule so no page or registry `className` changes:

```css
[data-editable-field] { outline: 1px dashed rgb(251 146 60 / 0.75); outline-offset: 2px; }
[data-editable-field]:focus { outline: 2px solid rgb(249 115 22); }
```

Net: ~8 lines of app CSS replacing ~40.

### `EditableUrl` → a single field panel

A URL is not rendered text, so it has no host element to decorate. Today pages
solve that with app-authored layout markup — `<div className="grid w-full gap-2
sm:grid-cols-3">` at `src/app/(frontend)/page.tsx:66` and
`src/app/(frontend)/kontakt/page.tsx:116`, plus `<div className="p-3">` at
`kontakt/page.tsx:96`. That is exactly the bespoke visual wrapper `AGENTS.md`
forbids.

Move all seven link fields into one `Sheet` opened from the existing savebar:

- `src/components/editor/page-content-panel.tsx` — `Sheet` + `SheetContent` +
  `FieldGroup`/`Field`/`FieldLabel` + `Input`, all already installed
  (`src/components/ui/sheet.tsx:95`, `src/components/ui/field.tsx:161`,
  `src/components/ui/input.tsx:19`). No new visual `className`.
- `src/lib/page-content-fields.ts` — per-page map of link field → Polish label,
  carrying over the existing `label` props (`"Mapa: Poręba"`, `"Link do mapy"`,
  `"Link do Instagrama"`, …).
- Anchors in pages keep `href={content.someUrl}` and gain
  `data-editable-field="someUrl"` so a click in edit mode can focus the matching
  row (optional, second pass).

`SheetTrigger` goes into the savebar in `PageContentEditor`, next to the
existing Cofnij/Zapisz buttons.

`.inline-page-url` (`globals.css:144-174`) is deleted.

### Media stays where it is

`EditableImage` and `EditableMediaUpload` are absolutely-positioned overlays
over the media they replace — they have no host element to decorate and must
stay anchored to the image/video. They are unchanged by this plan, as is
`usePageContentField` (used by `src/components/hero-video.tsx:9`). Only *link*
`*Url` fields move to the panel.

### Context extraction

`PageContentContext` currently lives inside `page-content-editor.tsx`. Move it
to `src/components/editor/page-content-context.ts` so `editable.tsx`,
`page-content-panel.tsx`, and `page-content-editor.tsx` can share it without a
cycle. Add `generation: number` to the context value.

## contentEditable correctness

Three things must be handled or this regresses:

1. **Never re-render mid-typing.** Commit on `onBlur`, not `onInput`. React's
   VDOM does not observe user typing, so any re-render while focused with a
   stale `children` value fights the caret.
2. **Force remounts when the value changes from outside.** Two paths do this:
   the localStorage draft restore (`page-content-editor.tsx:51-54`, which sets
   `values` after mount) and `clear()` (`page-content-editor.tsx:62-67`).
   Without a remount, React diffs *last committed children* against the new
   value; if the user typed without blurring, React sees no prop change and
   leaves the stale typed text in the DOM. Fix: a `generation` counter in
   context, incremented by draft-restore and `clear()`, used as `key`.
3. **Per-keystroke drafts.** On-blur commit means a tab close mid-field loses
   that field. If we want today's behaviour back, add a debounced `onInput` that
   writes `localStorage` only and never touches `values` — keeps the caret
   stable and preserves the draft.

Notes:

- `contentEditable="plaintext-only"` is supported in Chrome/Safari and Firefox
  ≥ 136. Fallback if a wider floor is needed: plain `contentEditable` plus an
  `onPaste` handler that inserts `event.clipboardData.getData("text/plain")`.
- `multiline={false}` must `preventDefault()` on Enter — several multiline hosts
  (`aboutBody`, `description`) lack `whitespace-pre-line`, so a typed newline
  would round-trip to the server but not render. Only hosts that already carry
  `whitespace-pre-line` (`galeria:36`, `rezerwacje:36`, `kontakt:43`,
  `noclegi:34`, `zorganizuj-impreze:41`) should pass `multiline`.
- Do **not** set `role="textbox"` on headings; it clobbers heading semantics.
  `contentEditable` is already exposed as editable to AT. `aria-label` is enough.
- `parsePageContent` rejects empty and >1200-char values
  (`src/lib/page-content-schema.ts:112-118`). Emptying a field in the DOM now
  surfaces as a save error rather than an empty input — acceptable, but the
  savebar error already renders it.

## Steps

1. **Extract context.** New `src/components/editor/page-content-context.ts`
   with `PageContentContextValue` + `generation`. Re-export from
   `page-content-editor.tsx` so nothing breaks yet.
2. **Add `Editable`.** New `src/components/editor/editable.tsx`. Add the
   `[data-editable-field]` CSS. Leave `EditableText`/`EditableUrl` in place.
3. **Wire `generation`.** Bump on draft restore and on `clear()`.
4. **Convert `noclegi`** — 4 `EditableText`, 1 `EditableImage`
   (`src/app/(frontend)/noclegi/page.tsx`). Verify: type → blur → Zapisz →
   `router.refresh()`; type → Cofnij zmiany; reload with a pending draft.
5. **Convert the remaining pages** in ascending size: `galeria` (4),
   `rezerwacje` (4), `zorganizuj-impreze` (4), `zgloszenie` (5), `kontakt` (15),
   `page.tsx` (37).
6. **Build the panel.** `page-content-panel.tsx` + `page-content-fields.ts`;
   add `SheetTrigger` to the savebar; delete the `EditableUrl` call sites and
   their `grid`/`p-3` wrappers on `page.tsx` and `kontakt/page.tsx`.
7. **Delete** `EditableText`, `EditableUrl`, and the `.inline-page-content` /
   `.inline-page-url` CSS blocks. Confirm with
   `rg 'EditableText|EditableUrl|inline-page-' apps/web/src` returning nothing.
8. `pnpm check`.
9. Visual QA per page (see below), then commit and push; monitor CI to green per
   `AGENTS.md`.

## Risks

- **New `<span>` in flex/grid hosts.** Where a field had no wrapper element,
  `Editable` now emits a `<span>`. Registry variants use child selectors
  (`[&>svg]`, `has-data-[icon=…]` in `badge.tsx:6`); a new span could match a
  `[&>span]`-style rule. Mitigation: prefer passing the element that *already*
  wraps the text via `render`, and only fall back to the default span where
  nothing wraps it. Requires a visual diff per page before/after.
- **`cloneElement` prop collisions.** If a `render` element already sets
  `onBlur`/`children`, the clone silently wins. None of the current call sites
  do; assert it during conversion.
- **RSC boundary.** `render` elements must not carry event handlers. Current
  call sites are pure markup, but `page.tsx:52-65` maps over an array to build
  anchors — check that conversion does not pull a handler across.
- **Nested-interactive.** `heroPrimaryCta`/`heroSecondaryCta` sit inside
  `<Button asChild><Link>` (`page.tsx:84-93`). Making the link's text
  contentEditable inside an anchor means clicks navigate instead of placing a
  caret. Needs `onClick` `preventDefault()` in edit mode, or `render` targeting
  an inner span. Decide during step 5; the same applies to the location anchors
  at `page.tsx:56-66` and the map anchor at `kontakt/page.tsx:80-95`.

## Out of scope

- `offer-inline-editor.tsx`, `equipment-editor.tsx`, `gallery-item-editor.tsx`
  — separate form-based editors, unaffected.
- The savebar's own app-authored markup (`page-content-editor.tsx:91-113`).
  Pre-existing; this plan does not add to it beyond one registry `SheetTrigger`.
- Payload admin UI.
