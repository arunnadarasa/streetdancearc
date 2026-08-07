// Server-only Pinata (IPFS) adapter.
//
// Worker-safe: plain fetch + FormData against api.pinata.cloud, no Node SDK.
// Without PINATA_JWT every helper reports "not configured" and callers fall
// back to the locally computed CID preview.

const API = "https://api.pinata.cloud";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ALLOWED_MEDIA_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function pinningEnabled(): boolean {
  return Boolean(process.env["PINATA_JWT"]);
}

export function gatewayBase(): string {
  const custom = process.env["PINATA_GATEWAY"];
  if (!custom) return "https://gateway.pinata.cloud/ipfs";
  const host = custom.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${host}/ipfs`;
}

export function gatewayUrl(cid: string): string {
  return `${gatewayBase()}/${cid}`;
}

function jwt(): string {
  const token = process.env["PINATA_JWT"];
  if (!token) throw new Error("pinata_not_configured");
  return token;
}

export interface PinResult {
  cid: string;
  gateway: string;
  size: number;
}

/** Pin a binary file (a move clip) and return its CID. */
export async function pinFile(file: File, name: string): Promise<PinResult> {
  const form = new FormData();
  form.append("file", file, name);
  form.append("pinataMetadata", JSON.stringify({ name }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const res = await fetch(`${API}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt()}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`pinata_file_failed:${res.status}:${text.slice(0, 200)}`);
  const json = JSON.parse(text) as { IpfsHash?: string; PinSize?: number };
  if (!json.IpfsHash) throw new Error("pinata_no_cid");
  return { cid: json.IpfsHash, gateway: gatewayUrl(json.IpfsHash), size: json.PinSize ?? file.size };
}

/** Pin a JSON document (the move metadata) and return its CID. */
export async function pinJson(body: unknown, name: string): Promise<PinResult> {
  const res = await fetch(`${API}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      pinataContent: body,
      pinataMetadata: { name },
      pinataOptions: { cidVersion: 1 },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`pinata_json_failed:${res.status}:${text.slice(0, 200)}`);
  const json = JSON.parse(text) as { IpfsHash?: string; PinSize?: number };
  if (!json.IpfsHash) throw new Error("pinata_no_cid");
  return { cid: json.IpfsHash, gateway: gatewayUrl(json.IpfsHash), size: json.PinSize ?? 0 };
}
