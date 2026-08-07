# Video-backed move registration (Pinata → Arc)

Short answer: yes, it's worth adding. Right now a "move" is only a JSON description — the rights record has no evidence of the actual choreography. Pinning a clip makes the on-chain log point at the real move, which is the whole premise of the marketplace.

## What changes

In the move registry (Step 1 · Preview metadata):

- New "Upload move clip" field above the metadata form. Accepts MP4/MOV/WebM, capped at 25 MB and ~15 seconds of footage (keeps pin costs and mobile uploads sane).
- On selection the clip is pinned to IPFS via Pinata. The card shows an inline video preview, the video CID, and a gateway link.
- The metadata JSON gains a `media` block (`videoCid`, `gatewayUrl`, `mimeType`, `sizeBytes`, `durationSeconds`), so the previewed metadata CID now commits to the clip.
- The metadata JSON itself gets pinned too, so the CID logged on Arc is retrievable rather than just a local hash.
- "Approve & Log Move" is unchanged: it logs the metadata CID to `DanceMoveTokens` and returns the Arcscan receipt. Receipt history entries can then link through to the clip.

Video is optional — a text-only move still registers exactly as it does today, so nothing regresses if Pinata is down.

## What I need from you

A **Pinata JWT** (Pinata dashboard → API Keys → new key with `pinFileToIPFS` and `pinJSONToIPFS`). I'll store it as `PINATA_JWT` and, if you want gateway links on your dedicated subdomain, a `PINATA_GATEWAY` host too. Without a key the upload field stays hidden and the current local-CID flow keeps working.

## Technical notes

- `src/lib/pinata.server.ts`: `pinFile` and `pinJson` against `api.pinata.cloud/pinning/*`, Bearer `PINATA_JWT`, returning `{ cid, gatewayUrl }`. Worker-safe (`fetch` + `FormData`, no Node SDK).
- `src/lib/pinata.functions.ts`: `pinMoveVideo` (accepts base64 or a direct multipart pass-through) and `pinMoveMetadata` server functions; both return a demo-style `{ ok: false, reason }` instead of throwing when the JWT is absent.
- Because a server function can't take a raw stream, uploads go through a server route `src/routes/api/public/pin` that reads `request.formData()` and forwards to Pinata — with a size guard and MIME allowlist inside the handler.
- `src/lib/move-metadata.ts`: extend `MoveMetadata` with the optional `media` block; `computeCid` stays as the local preview hash and is cross-checked against Pinata's returned CID (they should match for raw JSON pinning; if they differ, the Pinata CID wins since that's what resolves).
- `MetadataPreview.tsx` owns the upload UI, progress state, and reset-on-change behaviour already in place.
- No contract change — `log(token, amount, cid)` is unchanged.
