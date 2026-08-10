import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Film, Hash, ShieldAlert, ShieldCheck, Upload, X } from "lucide-react";
import type { MoveMedia } from "@/lib/move-metadata";
import {
  CHUNK_BYTES,
  computeUnixfsCid,
  hashingAvailable,
  verifyPinnedCid,
  type Verification,
} from "@/lib/ipfs-cid";

interface Props {
  media: MoveMedia | null;
  maxUploadBytes: number;
  onPinned: (media: MoveMedia) => void;
  onClear: () => void;
}

const ACCEPT = "video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp,image/gif";

interface Staged {
  file: File;
  url: string;
  /** UnixFS CIDv1 computed locally, or null when hashing was unavailable. */
  contentHash: string | null;
  /** Why the local hash is missing, when it is. */
  hashError: string | null;
  chunks: number;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  isVideo: boolean;
}

function mb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function clock(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Reads duration + intrinsic size from a local object URL, before any upload. */
function probe(file: File, url: string): Promise<{ durationSec: number | null; width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const done = (v: { durationSec: number | null; width: number | null; height: number | null }) => resolve(v);
    if (file.type.startsWith("video/")) {
      const el = document.createElement("video");
      el.preload = "metadata";
      el.onloadedmetadata = () =>
        done({
          durationSec: Number.isFinite(el.duration) ? el.duration : null,
          width: el.videoWidth || null,
          height: el.videoHeight || null,
        });
      el.onerror = () => done({ durationSec: null, width: null, height: null });
      el.src = url;
    } else {
      const img = new Image();
      img.onload = () => done({ durationSec: null, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => done({ durationSec: null, width: null, height: null });
      img.src = url;
    }
  });
}

export function ClipPreview({ media, maxUploadBytes, onPinned, onClear }: Props) {
  const [staged, setStaged] = useState<Staged | null>(null);
  const [hashing, setHashing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (staged) URL.revokeObjectURL(staged.url);
  }, [staged]);

  async function onFile(file: File) {
    setError(null);
    setVerification(null);
    if (file.size > maxUploadBytes) {
      setError(`Clip is too large (max ${Math.round(maxUploadBytes / 1024 / 1024)} MB).`);
      return;
    }
    setHashing(true);
    setProgress(0);
    const url = URL.createObjectURL(file);
    try {
      const meta = await probe(file, url);
      let contentHash: string | null = null;
      let hashError: string | null = null;
      let chunks = Math.max(1, Math.ceil(file.size / CHUNK_BYTES));

      if (!hashingAvailable()) {
        hashError = "This browser blocked local hashing (it needs a secure https connection).";
      } else {
        try {
          // Streamed in 256 KiB slices so large clips never sit in memory whole.
          const result = await computeUnixfsCid(file, (f) => setProgress(f));
          contentHash = result.cid;
          chunks = result.chunks;
        } catch (e) {
          hashError = e instanceof Error && e.message === "no_subtle_crypto"
            ? "This browser blocked local hashing (it needs a secure https connection)."
            : "The clip could not be read end to end, so no local hash was computed.";
        }
      }

      setStaged({ file, url, contentHash, hashError, chunks, isVideo: file.type.startsWith("video/"), ...meta });
    } catch (e) {
      URL.revokeObjectURL(url);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setHashing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function pin() {
    if (!staged) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", staged.file, staged.file.name);
      form.append("name", staged.file.name);
      const res = await fetch("/api/public/pin", { method: "POST", body: form });
      const body = (await res.json()) as Partial<MoveMedia> & { error?: string };
      if (!res.ok || !body.cid) throw new Error(body.error ?? "Upload failed.");
      setVerification(
        staged.hashError
          ? { state: "unverifiable", reason: staged.hashError }
          : verifyPinnedCid(staged.contentHash, body.cid),
      );
      onPinned({
        cid: body.cid,
        uri: body.uri ?? `ipfs://${body.cid}`,
        gateway: body.gateway ?? "",
        mimeType: body.mimeType ?? staged.file.type,
        size: body.size ?? staged.file.size,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    if (staged) URL.revokeObjectURL(staged.url);
    setStaged(null);
    setVerification(null);
    onClear();
  }

  if (media) {
    const v = verification;
    return (
      <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-border/60 bg-surface p-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-bold text-foreground">
              <Check className="h-3.5 w-3.5 text-glow" aria-hidden />
              {media.mimeType.startsWith("video/") ? "Clip" : "Image"} pinned · {mb(media.size)}
            </p>
            <a
              href={media.gateway}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all text-[11px] text-glow hover:underline"
            >
              {media.uri}
            </a>

            {v?.state === "verified" && (
              <p className="mt-2 flex min-w-0 items-start gap-1.5 rounded-lg border border-glow/40 bg-glow/10 px-2 py-1.5 text-[11px] text-glow">
                <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>Content verified — the pinned CID matches the hash computed in your browser, chunk for chunk.</span>
              </p>
            )}

            {v?.state === "mismatch" && (
              <div className="mt-2 min-w-0 rounded-lg border border-red-500/50 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
                <p className="flex items-start gap-1.5 font-bold">
                  <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>Content hash mismatch — don't log this move yet.</span>
                </p>
                <p className="mt-1">{v.reason}</p>
                <p className="mt-1 break-all">
                  <span className="text-muted-foreground">Your browser: </span>
                  {staged?.contentHash}
                </p>
                <p className="break-all">
                  <span className="text-muted-foreground">Pinned: </span>
                  {media.cid}
                </p>
                <p className="mt-1 text-muted-foreground">Remove the clip and upload it again before minting.</p>
              </div>
            )}

            {v?.state === "unverifiable" && (
              <p className="mt-2 flex min-w-0 items-start gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-300">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  <span className="font-bold">Not verified.</span> {v.reason} The clip is pinned, but this browser could
                  not prove the stored bytes are the ones you previewed.
                </span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={reset}
            aria-label="Remove clip"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  if (staged) {
    return (
      <div className="min-w-0 max-w-full space-y-3 rounded-lg border border-border/60 bg-surface p-3">
        {staged.isVideo ? (
          <video src={staged.url} controls playsInline preload="metadata" className="aspect-video w-full rounded-lg bg-background object-contain" />
        ) : (
          <img src={staged.url} alt={staged.file.name} className="aspect-video w-full rounded-lg bg-background object-contain" />
        )}
        <dl className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div><dt className="uppercase tracking-widest">Size</dt><dd className="text-foreground">{mb(staged.file.size)}</dd></div>
          <div>
            <dt className="uppercase tracking-widest">Duration</dt>
            <dd className="text-foreground">{staged.durationSec !== null ? clock(staged.durationSec) : "—"}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-widest">Dimensions</dt>
            <dd className="text-foreground">{staged.width && staged.height ? `${staged.width}×${staged.height}` : "—"}</dd>
          </div>
          <div><dt className="uppercase tracking-widest">Type</dt><dd className="truncate text-foreground">{staged.file.type || "unknown"}</dd></div>
        </dl>

        <div className="min-w-0 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Hash className="h-3 w-3" aria-hidden /> IPFS content hash (computed locally)
          </p>
          {staged.contentHash ? (
            <>
              <code className="mt-1 block break-all text-[11px] text-glow">{staged.contentHash}</code>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Built the same way IPFS builds it — {staged.chunks.toLocaleString()}{" "}
                {staged.chunks === 1 ? "block" : "blocks"} of 256 KiB folded into one root, so the pin should return this
                exact CID.
              </p>
            </>
          ) : (
            <p className="mt-1 flex items-start gap-1.5 text-[11px] text-amber-300">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{staged.hashError} You can still pin, but the stored bytes won't be verifiable here.</span>
            </p>
          )}
        </div>

        {error && <p className="break-words text-[11px] text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void pin()}
            disabled={uploading}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/85 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" aria-hidden />
            {uploading ? "Pinning to IPFS…" : "Pin clip to IPFS"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          >
            Choose another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full rounded-lg border border-border/60 bg-surface p-3">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        disabled={hashing}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
        className="block w-full text-xs text-muted-foreground file:mr-3 file:h-9 file:cursor-pointer file:rounded-full file:border file:border-border file:bg-background/60 file:px-4 file:text-xs file:font-bold file:text-foreground"
      />
      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Film className="h-3 w-3" aria-hidden />
        {hashing
          ? `Hashing ${Math.round(progress * 100)}%…`
          : `MP4, MOV, WebM or an image · max ${Math.round(maxUploadBytes / 1024 / 1024)} MB`}
      </p>
      {hashing && (
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      {error && <p className="mt-1 break-words text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
