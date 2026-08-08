// Dependency-free UnixFS CID computation, browser-safe.
//
// Reproduces the CID that Kubo (and pinning services built on it) produce for
// a file added with default settings: 262144-byte fixed-size chunks, a
// balanced DAG with at most 174 links per parent, dag-pb + UnixFS framing,
// sha2-256 multihash, emitted as CIDv1 base32.
//
// Everything is streamed with File.slice(), so a 25 MB clip never lands in
// memory in one piece.

/** Kubo default chunk size. */
export const CHUNK_BYTES = 262144;
/** Kubo default balanced-DAG fan-out. */
export const MAX_LINKS = 174;

const B32 = "abcdefghijklmnopqrstuvwxyz234567";

function base32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Decodes a base58btc string (CIDv0 / Qm…) into bytes. Returns null if invalid. */
function base58Decode(input: string): Uint8Array | null {
  const bytes: number[] = [0];
  for (const ch of input) {
    const value = B58.indexOf(ch);
    if (value < 0) return null;
    let carry = value;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i]! * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < input.length && input[i] === "1"; i++) bytes.push(0);
  return new Uint8Array(bytes.reverse());
}

// ---------------------------------------------------------------- protobuf
//
// A growable byte sink; chunks are up to 256 KiB, so nothing here may use
// spread (`push(...bytes)`) — that overflows the argument stack.

class Sink {
  private buf = new Uint8Array(1024);
  private len = 0;

  private ensure(extra: number) {
    if (this.len + extra <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.len + extra) size *= 2;
    const next = new Uint8Array(size);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }

  byte(value: number) {
    this.ensure(1);
    this.buf[this.len++] = value & 0xff;
  }

  varint(value: number) {
    let v = value;
    while (v >= 0x80) {
      this.byte((v & 0x7f) | 0x80);
      v = Math.floor(v / 128);
    }
    this.byte(v);
  }

  bytes(src: Uint8Array) {
    this.ensure(src.length);
    this.buf.set(src, this.len);
    this.len += src.length;
  }

  /** Length-delimited field (wire type 2). */
  lenField(tag: number, payload: Uint8Array) {
    this.varint((tag << 3) | 2);
    this.varint(payload.length);
    this.bytes(payload);
  }

  /** Varint field (wire type 0). */
  varField(tag: number, value: number) {
    this.varint((tag << 3) | 0);
    this.varint(value);
  }

  get size() {
    return this.len;
  }

  take(): Uint8Array {
    return this.buf.slice(0, this.len);
  }
}


// -------------------------------------------------------------- primitives

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  if (!globalThis.crypto?.subtle) throw new Error("no_subtle_crypto");
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as BufferSource));
}

/** Binary CID: <version 0x01><codec><multihash>. */
function cidBytes(codec: number, digest: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + digest.length);
  out[0] = 0x01;
  out[1] = codec;
  out[2] = 0x12; // sha2-256
  out[3] = 0x20; // 32 bytes
  out.set(digest, 4);
  return out;
}

export function encodeCidV1(codec: number, digest: Uint8Array): string {
  return `b${base32(cidBytes(codec, digest))}`;
}

interface Node {
  /** Binary CID of this node, used as a dag-pb link hash. */
  cid: Uint8Array;
  /** Total size of the encoded block plus all descendants (dag-pb Tsize). */
  tsize: number;
  /** Payload bytes represented by this subtree (UnixFS filesize). */
  fileSize: number;
}

/**
 * UnixFS Data message for a leaf: Type=File(2), Data=bytes, filesize.
 * An empty file omits the Data field entirely, matching Kubo.
 */
function unixfsLeafData(chunk: Uint8Array): Uint8Array {
  const s = new Sink();
  s.varField(1, 2);
  if (chunk.length > 0) s.lenField(2, chunk);
  s.varField(3, chunk.length);
  return s.take();
}


/** UnixFS Data message for an internal node: Type=File(2), filesize, blocksizes[]. */
function unixfsBranchData(fileSize: number, blockSizes: number[]): Uint8Array {
  const s = new Sink();
  s.varField(1, 2);
  s.varField(3, fileSize);
  for (const size of blockSizes) s.varField(4, size);
  return s.take();
}

/** dag-pb PBNode: repeated PBLink links = 2, bytes Data = 1 (links first). */
function pbNode(links: Node[], data: Uint8Array): Uint8Array {
  const s = new Sink();
  for (const link of links) {
    const l = new Sink();
    l.lenField(1, link.cid); // Hash
    l.lenField(2, new Uint8Array(0)); // Name (empty)
    l.varField(3, link.tsize); // Tsize
    s.lenField(2, l.take());
  }
  s.lenField(1, data);
  return s.take();
}


async function makeNode(block: Uint8Array, fileSize: number, childTsize: number): Promise<Node> {
  return {
    cid: cidBytes(0x70, await sha256(block)),
    tsize: block.length + childTsize,
    fileSize,
  };
}

// ------------------------------------------------------------------- public

export interface UnixfsCidResult {
  /** CIDv1, dag-pb, base32 — directly comparable to a pinned CIDv1. */
  cid: string;
  /** Number of 256 KiB leaves the file was chunked into. */
  chunks: number;
  chunkBytes: number;
  maxLinks: number;
  bytes: number;
}

/**
 * Computes the UnixFS CID for a Blob/File by streaming it in chunks.
 * `onProgress` receives 0..1 as the leaves are hashed.
 */
export async function computeUnixfsCid(
  file: Blob,
  onProgress?: (fraction: number) => void,
): Promise<UnixfsCidResult> {
  const total = file.size;
  const leaves: Node[] = [];

  // Empty file: a single empty UnixFS file node (no Data field).
  if (total === 0) {
    const block = pbNode([], unixfsLeafData(new Uint8Array(0)));
    return {
      cid: encodeCidV1(0x70, await sha256(block)),
      chunks: 1,
      chunkBytes: CHUNK_BYTES,
      maxLinks: MAX_LINKS,
      bytes: 0,
    };
  }


  for (let offset = 0; offset < total; offset += CHUNK_BYTES) {
    const slice = file.slice(offset, Math.min(offset + CHUNK_BYTES, total));
    const chunk = new Uint8Array(await slice.arrayBuffer());
    const block = pbNode([], unixfsLeafData(chunk));
    leaves.push(await makeNode(block, chunk.length, 0));
    onProgress?.(Math.min(1, (offset + chunk.length) / total));
  }

  // Single chunk: the leaf is the root.
  if (leaves.length === 1) {
    const only = leaves[0]!;
    return {
      cid: `b${base32(only.cid)}`,
      chunks: 1,
      chunkBytes: CHUNK_BYTES,
      maxLinks: MAX_LINKS,
      bytes: total,
    };
  }

  // Balanced DAG: fold levels of up to MAX_LINKS children until one root left.
  let level = leaves;
  while (level.length > 1) {
    const next: Node[] = [];
    for (let i = 0; i < level.length; i += MAX_LINKS) {
      const group = level.slice(i, i + MAX_LINKS);
      const fileSize = group.reduce((sum, n) => sum + n.fileSize, 0);
      const childTsize = group.reduce((sum, n) => sum + n.tsize, 0);
      const block = pbNode(group, unixfsBranchData(fileSize, group.map((n) => n.fileSize)));
      next.push(await makeNode(block, fileSize, childTsize));
    }
    level = next;
  }

  return {
    cid: `b${base32(level[0]!.cid)}`,
    chunks: leaves.length,
    chunkBytes: CHUNK_BYTES,
    maxLinks: MAX_LINKS,
    bytes: total,
  };
}

/**
 * Normalises a CID for comparison: CIDv0 (`Qm…` base58 dag-pb) is re-encoded
 * as CIDv1 base32 so a version difference is not reported as a mismatch.
 * Returns null when the CID uses a form we cannot normalise.
 */
export function normalizeCid(cid: string): string | null {
  const value = cid.trim();
  if (!value) return null;
  if (value.startsWith("Qm")) {
    const raw = base58Decode(value);
    if (!raw || raw.length !== 34 || raw[0] !== 0x12 || raw[1] !== 0x20) return null;
    return encodeCidV1(0x70, raw.slice(2));
  }
  if (/^b[a-z2-7]+$/.test(value)) return value;
  return null;
}

/** True when `crypto.subtle` is available (absent on insecure origins). */
export function hashingAvailable(): boolean {
  return Boolean(globalThis.crypto?.subtle);
}

export type VerificationState = "verified" | "mismatch" | "unverifiable";

export interface Verification {
  state: VerificationState;
  reason?: string;
}

/** Compares a pinned CID against the locally computed UnixFS CID. */
export function verifyPinnedCid(localCid: string | null, pinnedCid: string): Verification {
  if (!localCid) {
    return { state: "unverifiable", reason: "No local hash was computed for this clip." };
  }
  const pinned = normalizeCid(pinnedCid);
  if (!pinned) {
    return {
      state: "unverifiable",
      reason: "The pinning service returned a CID in a format this browser can't re-derive.",
    };
  }
  const local = normalizeCid(localCid);
  if (!local) {
    return { state: "unverifiable", reason: "The local hash could not be normalised for comparison." };
  }
  if (local === pinned) return { state: "verified" };
  return {
    state: "mismatch",
    reason:
      "The stored content hash differs from the one computed in your browser. This usually means the service chunked the file with different settings — but it can also mean the bytes stored are not the bytes you previewed.",
  };
}
