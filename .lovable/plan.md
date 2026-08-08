# Reliable IPFS hash verification for larger clips

Today the browser hashes a clip by loading the whole file into memory and taking a plain SHA-256 (a "raw" CIDv1). That is not how IPFS builds a CID for anything but the simplest case, so for larger clips the local hash and the pinned CID never line up, and the UI just shrugs with "the pinned CID will differ". This makes the integrity check unverifiable exactly when it matters most.

The fix is to compute the *real* IPFS CID in the browser — the same chunked, multi-block CID the pinning service produces — and to be explicit and loud whenever that comparison can't be made.

## What changes for you

1. **Big clips get a real, matchable hash.** The browser walks the clip in 256 KiB chunks and builds the same multi-block content tree IPFS uses, so a 12 MB clip produces the same CID the pin returns — not a "close enough" local hash.
2. **Memory-safe hashing.** The file is read chunk by chunk instead of all at once, with a progress indicator ("Hashing 42%…") so large clips don't freeze the tab or fail on mobile.
3. **A clear verdict after pinning**, one of three states:
   - **Verified** — pinned CID is byte-identical to what your browser computed.
   - **Mismatch** — a prominent warning: the bytes stored differ from what you previewed; do not log this move until it's re-uploaded.
   - **Not verifiable** — an explicit amber notice naming *why* (e.g. the service returned a CID built with different chunking settings, or your browser blocked local hashing), rather than silently implying everything is fine.
4. **Honest pre-pin copy.** Before pinning, the panel states whether the computed CID is expected to match, and never claims a match it can't guarantee.

## Technical approach

**`src/lib/ipfs-cid.ts` (new)** — dependency-free UnixFS CID builder:
- Chunk the file with `File.slice()` at 262144 bytes, hashing each chunk with `crypto.subtle.digest`, never holding more than one chunk in memory.
- Encode each leaf as a UnixFS `dag-pb` node (`Data{Type:File, filesize, blocksizes}` wrapped in a PBNode) and hash it; single-chunk files collapse to one node.
- Build a balanced DAG over the leaves with a max of 174 links per parent, matching go-ipfs/Kubo defaults, until a single root remains.
- Emit CIDv1 (`0x01`, dag-pb `0x70`, sha2-256) in base32, plus expose the leaf count and the parameters used.
- Async generator/callback for progress reporting.
- Keep the existing `computeCid` (raw CIDv1 for metadata JSON) untouched — the metadata path is a different code path and is out of scope.

**`src/lib/move-metadata.ts`** — keep `computeBytesCid` for JSON, mark the raw-CID clip path as superseded, keep `IPFS_BLOCK_BYTES` as the shared chunk constant.

**`src/components/dance/ClipPreview.tsx`**:
- Replace the `arrayBuffer()` + raw hash in `onFile` with the streaming UnixFS builder, storing `contentHash`, `chunks`, and a `verifiable` flag; render hashing progress.
- Add a `VerificationState` (`verified` | `mismatch` | `unverifiable`) computed after pinning by comparing the pinned CID against the locally computed one, normalising CIDv0 (`Qm…` base58) to CIDv1 base32 before comparing so a version difference isn't reported as a mismatch.
- Replace the current single grey line with a colour-coded badge: green check (verified), red warning (mismatch, with both CIDs shown and a "re-upload" prompt), amber warning (unverifiable, with the specific reason).
- Guard `crypto.subtle` availability (absent on insecure origins) and surface that as an `unverifiable` reason instead of throwing.
- Keep the existing mobile-safe wrapping (`min-w-0`, `break-all`) on the new CID rows.

**Verification before finishing**: hash a small file and a >256 KiB file in a headless browser and confirm the multi-chunk root CID matches a reference IPFS CID for the same bytes, then confirm a real pin round-trip lands in the `verified` state. If the service's chunking settings turn out to differ from the Kubo defaults, the mismatch surfaces as `unverifiable` with that reason rather than as a false alarm.
