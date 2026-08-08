import { useEffect, useState } from "react";
import { Check, FileJson, RefreshCw } from "lucide-react";
import { ClipPreview } from "./ClipPreview";

import { useServerFn } from "@tanstack/react-start";
import {
  DISCIPLINES,
  LICENSES,
  buildMoveMetadata,
  computeCid,
  serializeMetadata,
  type MoveMedia,
  type MoveMetadataInput,
} from "@/lib/move-metadata";
import { pinMoveMetadata } from "@/lib/nft.functions";

interface Props {
  token: MoveMetadataInput["token"];
  amount: string;
  cid: string | null;
  pinningEnabled: boolean;
  maxUploadBytes: number;
  onConfirm: (cid: string, json: string) => void;
  onReset: () => void;
}

export function MetadataPreview({
  token,
  amount,
  cid,
  pinningEnabled,
  maxUploadBytes,
  onConfirm,
  onReset,
}: Props) {
  const [move, setMove] = useState("");
  const [discipline, setDiscipline] = useState<string>(DISCIPLINES[0]);
  const [rightsHolder, setRightsHolder] = useState("");
  const [license, setLicense] = useState<string>(LICENSES[0]);
  const [media, setMedia] = useState<MoveMedia | null>(null);
  const [preview, setPreview] = useState<{ json: string; cid: string; pinned: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const pinJson = useServerFn(pinMoveMetadata);

  const meta = buildMoveMetadata({ move, discipline, rightsHolder, license, token, amount, media });
  const json = serializeMetadata(meta);

  // Any edit (including token/amount/clip) invalidates a confirmed CID.
  useEffect(() => {
    if (preview && preview.json !== json) {
      setPreview(null);
      onReset();
    }
  }, [json, preview, onReset]);


  async function onPreview() {
    setBusy(true);
    try {
      if (pinningEnabled) {
        const pinned = await pinJson({ data: { json, name: move || "streetrail-move" } });
        if (pinned.pinned && pinned.cid) {
          setPreview({ json, cid: pinned.cid, pinned: true });
          return;
        }
      }
      const next = await computeCid(json);
      setPreview({ json, cid: next, pinned: false });
    } catch {
      const next = await computeCid(json);
      setPreview({ json, cid: next, pinned: false });
    } finally {
      setBusy(false);
    }
  }

  const confirmed = Boolean(cid && preview && cid === preview.cid);

  return (
    <div className="min-w-0 space-y-3 overflow-hidden rounded-xl border border-border bg-background/40 p-4">
      <div className="flex items-center gap-2">
        <FileJson className="h-4 w-4 text-glow" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Step 1 · Preview metadata
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Move name</span>
          <input
            value={move}
            onChange={(e) => setMove(e.target.value)}
            placeholder="Toprock cypher entry"
            className="mt-1 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Discipline</span>
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          >
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Rights holder</span>
          <input
            value={rightsHolder}
            onChange={(e) => setRightsHolder(e.target.value)}
            placeholder="Crew or dancer name"
            className="mt-1 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">License</span>
          <select
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          >
            {LICENSES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>

      {pinningEnabled && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Move clip (optional evidence)
          </p>
          <ClipPreview
            media={media}
            maxUploadBytes={maxUploadBytes}
            onPinned={setMedia}
            onClear={() => setMedia(null)}
          />
        </div>
      )}


      {preview ? (
        <div className="min-w-0 space-y-3">
          <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-border/60 bg-surface">
            <pre className="max-h-64 w-full max-w-full overflow-auto overscroll-x-contain p-3 text-[11px] leading-relaxed text-muted-foreground">
              {preview.json}
            </pre>
          </div>
          <p className="text-[11px] text-muted-foreground">Swipe the block above to read long lines.</p>
          <div className="min-w-0 rounded-lg border border-border/60 bg-surface px-3 py-2">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {preview.pinned ? "Pinned IPFS CID" : "Computed IPFS CID (not pinned)"}
            </p>
            <code className="mt-1 block break-all text-xs text-glow">{preview.cid}</code>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onConfirm(preview.cid, preview.json)}
              disabled={confirmed}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/85 disabled:opacity-60"
            >
              {confirmed ? <Check className="h-4 w-4" aria-hidden /> : null}
              {confirmed ? "CID confirmed" : "Use this CID"}
            </button>
            <button
              type="button"
              onClick={() => void onPreview()}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" aria-hidden /> Recompute
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void onPreview()}
          disabled={busy}
          className="h-10 w-full rounded-full border border-border bg-surface px-4 text-sm font-bold text-foreground transition hover:border-primary disabled:opacity-50"
        >
          {busy ? (pinningEnabled ? "Pinning metadata…" : "Hashing…") : "Preview metadata & CID"}
        </button>
      )}
    </div>
  );
}
