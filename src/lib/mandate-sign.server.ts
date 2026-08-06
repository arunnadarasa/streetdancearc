// Server-only Ed25519 signer for AP2 mandates and UCP payloads.
//
// The private seed lives in MANDATE_SIGNING_SEED (project secret). The public
// key is published as a JWK on /api/public/ucp/discovery so anyone can verify
// the mandates this app issues.

import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";

export const MANDATE_KID = "streetrail-ed25519-1";

const b64url = (bytes: Uint8Array) => {
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

function seed(): Uint8Array {
  const raw = process.env["MANDATE_SIGNING_SEED"];
  if (!raw) throw new Error("missing_secret:MANDATE_SIGNING_SEED");
  return sha256(new TextEncoder().encode(raw));
}

/** Deterministic JSON so signer and verifier hash the same bytes. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => k !== "signature" && obj[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(",")}}`;
}

/** `ed25519:<kid>:<base64url signature>` over the canonical JSON of the payload. */
export function signMandate(payload: unknown): string {
  const msg = new TextEncoder().encode(canonical(payload));
  const sig = ed25519.sign(msg, seed());
  return `ed25519:${MANDATE_KID}:${b64url(sig)}`;
}

export function publicJwk() {
  return {
    kid: MANDATE_KID,
    kty: "OKP" as const,
    crv: "Ed25519" as const,
    use: "sig" as const,
    alg: "EdDSA" as const,
    x: b64url(ed25519.getPublicKey(seed())),
  };
}

/** Replace a mandate's placeholder signature with a real Ed25519 one. */
export function signed<T extends { signature: string }>(mandate: T): T {
  return { ...mandate, signature: signMandate(mandate) };
}
