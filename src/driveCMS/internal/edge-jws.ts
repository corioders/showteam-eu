/** biome-ignore-all lint/style/useNamingConvention: This code is vibe-generated with GPT */
/** biome-ignore-all lint/performance/useTopLevelRegex: This code is vibe-generated with GPT */
/** biome-ignore-all lint/style/useBlockStatements: This code is vibe-generated with GPT */

import { type ErrorReturn, type ErrorReturnPromise, safePromise } from "@/error/index.js";

type JWSHeader = Record<string, unknown>;
type Payload = Record<string, unknown> | string | Uint8Array;

type RsaPrivateJwk = {
	kty: "RSA";
	n: string;
	e: string;
	d: string;
	p?: string;
	q?: string;
	dp?: string;
	dq?: string;
	qi?: string;
	alg?: string;
	key_ops?: string[];
	ext?: boolean;
};

type SecretInput = unknown; // CryptoKey-like | RsaPrivateJwk | PKCS#8 PEM string

function getSubtle(): ErrorReturn<any> {
	const subtle = (globalThis as any)?.crypto?.subtle;
	if (!subtle) {
		return [null, new Error("WebCrypto SubtleCrypto is not available. In Node, use:\nimport { webcrypto } from 'node:crypto';\nglobalThis.crypto = webcrypto as any;")];
	}
	return [subtle, null];
}

function utf8(input: string): Uint8Array {
	return new TextEncoder().encode(input);
}

function toBase64(bytes: Uint8Array): string {
	if (typeof Buffer !== "undefined") {
		return Buffer.from(bytes).toString("base64");
	}
	let bin = "";
	const chunk = 0x80_00;
	for (let i = 0; i < bytes.length; i += chunk) {
		const part = bytes.subarray(i, i + chunk);
		bin += String.fromCharCode(...part);
	}
	return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
	if (typeof Buffer !== "undefined") {
		return new Uint8Array(Buffer.from(b64, "base64"));
	}
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

function toBase64Url(bytes: Uint8Array): string {
	return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlFromString(s: string): string {
	return toBase64Url(utf8(s));
}

function isPemPrivateKey(pem: string): boolean {
	return /-----BEGIN (RSA )?PRIVATE KEY-----/.test(pem);
}

function extractPemBase64(pem: string): string {
	return pem
		.replace(/-----BEGIN [^-]+-----/g, "")
		.replace(/-----END [^-]+-----/g, "")
		.replace(/\s+/g, "");
}

function isCryptoKeyLike(v: unknown): v is { usages?: string[] } {
	return typeof v === "object" && v !== null && Array.isArray((v as any).usages);
}

function isRsaPrivateJwk(v: unknown): v is RsaPrivateJwk {
	const o = v as any;
	return o && typeof o === "object" && o.kty === "RSA" && typeof o.d === "string";
}

async function importPrivateKeyRS256(secret: SecretInput): ErrorReturnPromise<any> {
	const [subtle, subtleError] = getSubtle();
	if (subtleError) {
		return [null, subtleError];
	}

	// 1) CryptoKey-like
	if (isCryptoKeyLike(secret)) {
		if (!secret.usages?.includes("sign")) {
			return [null, new Error("Provided CryptoKey does not have 'sign' usage.")];
		}
		return [secret, null];
	}

	// 2) JWK (private)
	if (isRsaPrivateJwk(secret)) {
		return safePromise(() => subtle.importKey("jwk", secret, { hash: "SHA-256", name: "RSASSA-PKCS1-v1_5" }, false, ["sign"]));
	}

	// 3) PEM (PKCS#8)
	if (typeof secret === "string" && isPemPrivateKey(secret)) {
		if (/BEGIN RSA PRIVATE KEY/.test(secret)) {
			// This is PKCS#1. WebCrypto expects PKCS#8.
			return [
				null,
				new Error(
					"PKCS#1 detected (BEGIN RSA PRIVATE KEY). Convert to PKCS#8, e.g.:\n" +
						"openssl pkcs8 -topk8 -inform PEM -outform PEM " +
						"-in rsa_pkcs1.pem -out private_pkcs8.pem -nocrypt",
				),
			];
		}
		const der = fromBase64(extractPemBase64(secret));
		return safePromise(() => subtle.importKey("pkcs8", der, { hash: "SHA-256", name: "RSASSA-PKCS1-v1_5" }, false, ["sign"]));
	}

	return [null, new Error("Unsupported secret format. Use a CryptoKey, an RSA private JWK (with 'd'), or a PKCS#8 PEM private key.")];
}

function encodeHeader(header?: JWSHeader): ErrorReturn<string> {
	const h: JWSHeader = {
		alg: "RS256",
		typ: "JWT",
		...(header || {}),
	};
	if (h["alg"] !== "RS256") {
		return [null, new Error('Only RS256 is supported (header.alg must be "RS256").')];
	}
	return [base64UrlFromString(JSON.stringify(h)), null];
}

function encodePayload(payload: Payload): string {
	if (payload instanceof Uint8Array) return toBase64Url(payload);
	if (typeof payload === "string") return base64UrlFromString(payload);
	return base64UrlFromString(JSON.stringify(payload));
}

/**
 * Sign a JWT using RS256 (RSASSA-PKCS1-v1_5 + SHA-256) via WebCrypto SubtleCrypto.
 * No external libraries required.
 */
export async function sign({ header, payload, secret }: { header?: JWSHeader; payload: Payload; secret: SecretInput }): ErrorReturnPromise<string> {
	const [subtle, subtleError] = getSubtle();
	if (subtleError) {
		return [null, subtleError];
	}
	const [cryptoKey, cryptoKeyError] = await importPrivateKeyRS256(secret);
	if (cryptoKeyError) {
		return [null, cryptoKeyError];
	}

	const [encodedHeader, encodedHeaderError] = encodeHeader(header);
	if (encodedHeaderError) {
		return [null, encodedHeaderError];
	}
	const encodedPayload = encodePayload(payload);
	const signingInput = `${encodedHeader}.${encodedPayload}`;

	const [signature, signatureError] = await safePromise<ArrayBuffer>(() => subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, cryptoKey, utf8(signingInput)));
	if (signatureError) {
		return [null, signatureError];
	}

	const sigB64u = toBase64Url(new Uint8Array(signature));
	return [`${signingInput}.${sigB64u}`, null];
}

// ==================================================
// ==================================================
// ==================================================
// From scratch. No imports

// /* RS256 JWT sign from scratch:
//  * - No external libs
//  * - No node:crypto / WebCrypto
//  * - Pure JS: SHA-256, Base64URL, ASN.1 DER parsing, RSA (PKCS#1 v1_5)
//  *
//  * SECURITY NOTE: Educational only. Do not use in production.
//  */

// type JWSHeader = Record<string, unknown>;
// type Payload = Record<string, unknown> | string | Uint8Array;

// export function sign({
// 	header,
// 	payload,
// 	secret,
// }: {
// 	header?: JWSHeader;
// 	payload: Payload;
// 	secret: string; // PEM PKCS#1 (RSA PRIVATE KEY) or PKCS#8 (PRIVATE KEY)
// }): string {
// 	const hdr: JWSHeader = {
// 		alg: "RS256",
// 		typ: "JWT",
// 		...(header || {}),
// 	};
// 	if (hdr.alg !== "RS256") {
// 		throw new Error('Only RS256 is supported (header.alg must be "RS256").');
// 	}

// 	const encodedHeader = base64urlEncode(utf8ToBytes(JSON.stringify(hdr)));
// 	const encodedPayload = encodePayload(payload);

// 	const signingInput = `${encodedHeader}.${encodedPayload}`;
// 	const msgBytes = utf8ToBytes(signingInput);

// 	const hash = sha256(msgBytes);
// 	const { n, d, nBytes } = parsePemPrivateKey(secret);

// 	const sig = rsassaPkcs1V15SignSha256(hash, n, d, nBytes);
// 	const sigB64u = bytesToBase64Url(sig);

// 	return `${signingInput}.${sigB64u}`;
// }

// /* ------------------------- Helpers: Encoding ------------------------- */

// function utf8ToBytes(s: string): Uint8Array {
// 	// Use TextEncoder if available; fallback manual UTF-8 encoding
// 	if (typeof TextEncoder !== "undefined") {
// 		return new TextEncoder().encode(s);
// 	}
// 	// Fallback UTF-8 encoder
// 	const bytes: number[] = [];
// 	for (let i = 0; i < s.length; ) {
// 		const cp = s.codePointAt(i)!;
// 		if (cp <= 0x7f) bytes.push(cp);
// 		else if (cp <= 0x7_ff) {
// 			bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
// 		} else if (cp <= 0xff_ff) {
// 			bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
// 		} else {
// 			bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
// 		}
// 		i += cp > 0xff_ff ? 2 : 1;
// 	}
// 	return new Uint8Array(bytes);
// }

// function encodePayload(payload: Payload): string {
// 	if (payload instanceof Uint8Array) {
// 		return bytesToBase64Url(payload);
// 	}
// 	if (typeof payload === "string") {
// 		return base64urlEncode(utf8ToBytes(payload));
// 	}
// 	return base64urlEncode(utf8ToBytes(JSON.stringify(payload)));
// }

// function base64urlEncode(data: Uint8Array): string {
// 	return bytesToBase64(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
// }

// function bytesToBase64Url(data: Uint8Array): string {
// 	return base64urlEncode(data);
// }

// function bytesToBase64(bytes: Uint8Array): string {
// 	const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
// 	let out = "";
// 	let i = 0;
// 	for (; i + 2 < bytes.length; i += 3) {
// 		const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
// 		out += abc[(n >> 18) & 63] + abc[(n >> 12) & 63] + abc[(n >> 6) & 63] + abc[n & 63];
// 	}
// 	if (i < bytes.length) {
// 		let n = bytes[i] << 16;
// 		out += abc[(n >> 18) & 63];
// 		if (i + 1 < bytes.length) {
// 			n |= bytes[i + 1] << 8;
// 			out += abc[(n >> 12) & 63] + abc[(n >> 6) & 63] + "=";
// 		} else {
// 			out += abc[(n >> 12) & 63] + "==";
// 		}
// 	}
// 	return out;
// }

// function base64ToBytes(b64: string): Uint8Array {
// 	const clean = b64.replace(/[\r\n\s]/g, "");
// 	const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
// 	const rev: Record<string, number> = {};
// 	for (let i = 0; i < abc.length; i++) rev[abc[i]] = i;
// 	let padding = 0;
// 	if (clean.endsWith("==")) padding = 2;
// 	else if (clean.endsWith("=")) padding = 1;

// 	const len = ((clean.length / 4) | 0) * 3 - padding;
// 	const out = new Uint8Array(len);

// 	let outIdx = 0;
// 	for (let i = 0; i < clean.length; i += 4) {
// 		const c1 = rev[clean[i]];
// 		const c2 = rev[clean[i + 1]];
// 		const c3 = rev[clean[i + 2]];
// 		const c4 = rev[clean[i + 3]];
// 		const n = (c1 << 18) | (c2 << 12) | ((c3 ?? 0) << 6) | (c4 ?? 0);

// 		if (outIdx < len) out[outIdx++] = (n >> 16) & 0xff;
// 		if (outIdx < len) out[outIdx++] = (n >> 8) & 0xff;
// 		if (outIdx < len) out[outIdx++] = n & 0xff;
// 	}
// 	return out;
// }

// /* ----------------------- SHA-256 (from scratch) ----------------------- */

// function sha256(msg: Uint8Array): Uint8Array {
// 	const K = new Uint32Array([
// 		0x42_8a_2f_98, 0x71_37_44_91, 0xb5_c0_fb_cf, 0xe9_b5_db_a5, 0x39_56_c2_5b, 0x59_f1_11_f1, 0x92_3f_82_a4, 0xab_1c_5e_d5, 0xd8_07_aa_98, 0x12_83_5b_01, 0x24_31_85_be,
// 		0x55_0c_7d_c3, 0x72_be_5d_74, 0x80_de_b1_fe, 0x9b_dc_06_a7, 0xc1_9b_f1_74, 0xe4_9b_69_c1, 0xef_be_47_86, 0x0f_c1_9d_c6, 0x24_0c_a1_cc, 0x2d_e9_2c_6f, 0x4a_74_84_aa,
// 		0x5c_b0_a9_dc, 0x76_f9_88_da, 0x98_3e_51_52, 0xa8_31_c6_6d, 0xb0_03_27_c8, 0xbf_59_7f_c7, 0xc6_e0_0b_f3, 0xd5_a7_91_47, 0x06_ca_63_51, 0x14_29_29_67, 0x27_b7_0a_85,
// 		0x2e_1b_21_38, 0x4d_2c_6d_fc, 0x53_38_0d_13, 0x65_0a_73_54, 0x76_6a_0a_bb, 0x81_c2_c9_2e, 0x92_72_2c_85, 0xa2_bf_e8_a1, 0xa8_1a_66_4b, 0xc2_4b_8b_70, 0xc7_6c_51_a3,
// 		0xd1_92_e8_19, 0xd6_99_06_24, 0xf4_0e_35_85, 0x10_6a_a0_70, 0x19_a4_c1_16, 0x1e_37_6c_08, 0x27_48_77_4c, 0x34_b0_bc_b5, 0x39_1c_0c_b3, 0x4e_d8_aa_4a, 0x5b_9c_ca_4f,
// 		0x68_2e_6f_f3, 0x74_8f_82_ee, 0x78_a5_63_6f, 0x84_c8_78_14, 0x8c_c7_02_08, 0x90_be_ff_fa, 0xa4_50_6c_eb, 0xbe_f9_a3_f7, 0xc6_71_78_f2,
// 	]);
// 	const H = new Uint32Array([0x6a_09_e6_67, 0xbb_67_ae_85, 0x3c_6e_f3_72, 0xa5_4f_f5_3a, 0x51_0e_52_7f, 0x9b_05_68_8c, 0x1f_83_d9_ab, 0x5b_e0_cd_19]);

// 	const l = msg.length;
// 	const withOne = l + 1;
// 	const zeroPad = (64 - ((withOne + 8) % 64)) % 64;
// 	const total = withOne + zeroPad + 8;
// 	const m = new Uint8Array(total);
// 	m.set(msg, 0);
// 	m[l] = 0x80;

// 	const bits = l * 8;
// 	const hi = Math.floor(bits / 0x1_00_00_00_00);
// 	const lo = bits >>> 0;
// 	m[total - 8] = (hi >>> 24) & 0xff;
// 	m[total - 7] = (hi >>> 16) & 0xff;
// 	m[total - 6] = (hi >>> 8) & 0xff;
// 	m[total - 5] = hi & 0xff;
// 	m[total - 4] = (lo >>> 24) & 0xff;
// 	m[total - 3] = (lo >>> 16) & 0xff;
// 	m[total - 2] = (lo >>> 8) & 0xff;
// 	m[total - 1] = lo & 0xff;

// 	const W = new Uint32Array(64);

// 	for (let i = 0; i < m.length; i += 64) {
// 		for (let j = 0; j < 16; j++) {
// 			const idx = i + j * 4;
// 			W[j] = (m[idx] << 24) | (m[idx + 1] << 16) | (m[idx + 2] << 8) | m[idx + 3];
// 		}
// 		for (let j = 16; j < 64; j++) {
// 			const s0 = ror(W[j - 15], 7) ^ ror(W[j - 15], 18) ^ (W[j - 15] >>> 3);
// 			const s1 = ror(W[j - 2], 17) ^ ror(W[j - 2], 19) ^ (W[j - 2] >>> 10);
// 			W[j] = (W[j - 16] + s0 + W[j - 7] + s1) >>> 0;
// 		}

// 		let a = H[0],
// 			b = H[1],
// 			c = H[2],
// 			d = H[3],
// 			e = H[4],
// 			f = H[5],
// 			g = H[6],
// 			h = H[7];

// 		for (let j = 0; j < 64; j++) {
// 			const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
// 			const ch = (e & f) ^ (~e & g);
// 			const t1 = (h + S1 + ch + K[j] + W[j]) >>> 0;
// 			const S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
// 			const maj = (a & b) ^ (a & c) ^ (b & c);
// 			const t2 = (S0 + maj) >>> 0;

// 			h = g;
// 			g = f;
// 			f = e;
// 			e = (d + t1) >>> 0;
// 			d = c;
// 			c = b;
// 			b = a;
// 			a = (t1 + t2) >>> 0;
// 		}
// 		H[0] = (H[0] + a) >>> 0;
// 		H[1] = (H[1] + b) >>> 0;
// 		H[2] = (H[2] + c) >>> 0;
// 		H[3] = (H[3] + d) >>> 0;
// 		H[4] = (H[4] + e) >>> 0;
// 		H[5] = (H[5] + f) >>> 0;
// 		H[6] = (H[6] + g) >>> 0;
// 		H[7] = (H[7] + h) >>> 0;
// 	}

// 	const out = new Uint8Array(32);
// 	for (let i = 0; i < 8; i++) {
// 		out[i * 4] = (H[i] >>> 24) & 0xff;
// 		out[i * 4 + 1] = (H[i] >>> 16) & 0xff;
// 		out[i * 4 + 2] = (H[i] >>> 8) & 0xff;
// 		out[i * 4 + 3] = H[i] & 0xff;
// 	}
// 	return out;

// 	function ror(x: number, n: number): number {
// 		return (x >>> n) | (x << (32 - n));
// 	}
// }

// /* -------------------- RSA + PKCS#1 v1.5 (sign) -------------------- */

// function rsassaPkcs1V15SignSha256(hash: Uint8Array, n: bigint, d: bigint, modulusBytes: number): Uint8Array {
// 	// DigestInfo for SHA-256:
// 	// 3031300d060960864801650304020105000420 || H
// 	const derPrefix = hexToBytes("3031300d060960864801650304020105000420");
// 	const T = concatBytes(derPrefix, hash);

// 	const k = modulusBytes; // length in bytes of the modulus n
// 	const psLen = k - T.length - 3;
// 	if (psLen < 8) {
// 		throw new Error("Intended encoded message length too short.");
// 	}
// 	const Em = new Uint8Array(k);
// 	Em[0] = 0x00;
// 	Em[1] = 0x01;
// 	for (let i = 0; i < psLen; i++) Em[2 + i] = 0xff;
// 	Em[2 + psLen] = 0x00;
// 	Em.set(T, 3 + psLen);

// 	const m = bytesToBigInt(Em);
// 	const s = modPow(m, d, n);
// 	return bigIntToBytes(s, k);
// }

// function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
// 	if (mod === 1n) return 0n;
// 	base %= mod;
// 	if (base < 0n) base += mod;
// 	let result = 1n;
// 	while (exp > 0n) {
// 		if (exp & 1n) result = (result * base) % mod;
// 		base = (base * base) % mod;
// 		exp >>= 1n;
// 	}
// 	return result;
// }

// function bytesToBigInt(bytes: Uint8Array): bigint {
// 	let n = 0n;
// 	for (const b of bytes) {
// 		n = (n << 8n) | BigInt(b);
// 	}
// 	return n;
// }

// function bigIntToBytes(n: bigint, len: number): Uint8Array {
// 	const out = new Uint8Array(len);
// 	for (let i = len - 1; i >= 0; i--) {
// 		out[i] = Number(n & 0xffn);
// 		n >>= 8n;
// 	}
// 	return out;
// }

// function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
// 	const out = new Uint8Array(a.length + b.length);
// 	out.set(a, 0);
// 	out.set(b, a.length);
// 	return out;
// }

// function hexToBytes(hex: string): Uint8Array {
// 	const clean = hex.replace(/[^0-9a-f]/gi, "");
// 	if (clean.length % 2) {
// 		throw new Error("hex length must be even");
// 	}
// 	const out = new Uint8Array(clean.length / 2);
// 	for (let i = 0; i < out.length; i++) {
// 		out[i] = Number.parseInt(clean.substr(i * 2, 2), 16);
// 	}
// 	return out;
// }

// /* ---------------------- PEM + ASN.1/DER parsing ---------------------- */

// function parsePemPrivateKey(pem: string): {
// 	n: bigint;
// 	d: bigint;
// 	nBytes: number; // modulus length in bytes
// } {
// 	const rsaKeyMatch = pem.match(/-----BEGIN RSA PRIVATE KEY-----([\s\S]*?)-----END RSA PRIVATE KEY-----/i);
// 	const pkcs8Match = pem.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/i);

// 	if (rsaKeyMatch) {
// 		const der = base64ToBytes(rsaKeyMatch[1]);
// 		return parsePkcs1RsaPrivateKey(der);
// 	}
// 	if (pkcs8Match) {
// 		const der = base64ToBytes(pkcs8Match[1]);
// 		return parsePkcs8PrivateKey(der);
// 	}

// 	throw new Error("Unsupported PEM. Expect RSA PRIVATE KEY (PKCS#1) or PRIVATE KEY (PKCS#8).");
// }

// function parsePkcs1RsaPrivateKey(der: Uint8Array): {
// 	n: bigint;
// 	d: bigint;
// 	nBytes: number;
// } {
// 	let off = 0;
// 	const seq = readAsn1Element(der, off);
// 	if (seq.tag !== 0x30) throw new Error("PKCS#1: expected SEQUENCE");
// 	off = seq.contentStart;

// 	// version
// 	const ver = readAsn1Element(der, off);
// 	if (ver.tag !== 0x02) throw new Error("PKCS#1: expected version INTEGER");
// 	off = ver.nextOffset;

// 	const nEl = readAsn1Element(der, off);
// 	if (nEl.tag !== 0x02) throw new Error("PKCS#1: expected modulus INTEGER");
// 	const nBytesRaw = der.slice(nEl.contentStart, nEl.contentEnd);
// 	const nBytes = stripLeadingZero(nBytesRaw);
// 	const n = bytesToBigInt(nBytes);
// 	off = nEl.nextOffset;

// 	const eEl = readAsn1Element(der, off);
// 	if (eEl.tag !== 0x02) throw new Error("PKCS#1: expected publicExponent");
// 	off = eEl.nextOffset;

// 	const dEl = readAsn1Element(der, off);
// 	if (dEl.tag !== 0x02) throw new Error("PKCS#1: expected privateExponent");
// 	const dBytesRaw = der.slice(dEl.contentStart, dEl.contentEnd);
// 	const d = bytesToBigInt(stripLeadingZero(dBytesRaw));
// 	off = dEl.nextOffset;

// 	return { d, n, nBytes: nBytes.length };
// }

// function parsePkcs8PrivateKey(der: Uint8Array): {
// 	n: bigint;
// 	d: bigint;
// 	nBytes: number;
// } {
// 	let off = 0;
// 	const top = readAsn1Element(der, off);
// 	if (top.tag !== 0x30) throw new Error("PKCS#8: expected SEQUENCE");
// 	off = top.contentStart;

// 	const ver = readAsn1Element(der, off);
// 	if (ver.tag !== 0x02) throw new Error("PKCS#8: expected version");
// 	off = ver.nextOffset;

// 	const alg = readAsn1Element(der, off);
// 	if (alg.tag !== 0x30) throw new Error("PKCS#8: expected alg SEQUENCE");
// 	off = alg.nextOffset;

// 	const pk = readAsn1Element(der, off);
// 	if (pk.tag !== 0x04) throw new Error("PKCS#8: expected privateKey OCTET");
// 	const inner = der.slice(pk.contentStart, pk.contentEnd);
// 	// inner is RSAPrivateKey (PKCS#1)
// 	return parsePkcs1RsaPrivateKey(inner);
// }

// function stripLeadingZero(bytes: Uint8Array): Uint8Array {
// 	let i = 0;
// 	while (i < bytes.length - 1 && bytes[i] === 0) i++;
// 	return bytes.subarray(i);
// }

// function readAsn1Element(
// 	buf: Uint8Array,
// 	offset: number,
// ): {
// 	tag: number;
// 	length: number;
// 	headerLen: number;
// 	contentStart: number;
// 	contentEnd: number;
// 	nextOffset: number;
// } {
// 	if (offset >= buf.length) throw new Error("ASN.1: out of range");
// 	const tag = buf[offset];
// 	const lenByte = buf[offset + 1];
// 	let len = 0;
// 	let lenBytes = 0;
// 	if ((lenByte & 0x80) === 0) {
// 		len = lenByte;
// 		lenBytes = 1;
// 	} else {
// 		const n = lenByte & 0x7f;
// 		if (n === 0 || n > 4) throw new Error("ASN.1: invalid length encoding");
// 		len = 0;
// 		for (let i = 0; i < n; i++) {
// 			len = (len << 8) | buf[offset + 2 + i];
// 		}
// 		lenBytes = 1 + n;
// 	}
// 	const headerLen = 1 + lenBytes;
// 	const contentStart = offset + headerLen;
// 	const contentEnd = contentStart + len;
// 	const nextOffset = contentEnd;
// 	if (contentEnd > buf.length) throw new Error("ASN.1: length overflow");
// 	return {
// 		contentEnd,
// 		contentStart,
// 		headerLen,
// 		length: len,
// 		nextOffset,
// 		tag,
// 	};
// }
