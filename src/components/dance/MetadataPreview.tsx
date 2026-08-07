import { useEffect, useState } from "react";
import { Check, FileJson, RefreshCw } from "lucide-react";
import {
  DISCIPLINES,
  LICENSES,
  buildMoveMetadata,
  computeCid,
  serializeMetadata,
  type MoveMetadataInput,
} from "@/lib/move-metadata";

interface Props {
  token: MoveMetadataInput["token"];
  amount: string;
  cid: string | null;
  onConfirm: (cid: string, json: string) => void;
  onReset: () => void;
}

export function MetadataPreview({ token, amount, cid, onConfirm, onReset }: Props) {
  const [move, setMove] = useState("");
  const [discipline, setDiscipline] = useState<string>(DISCIPLINES[0]);
  const [rightsHolder, setRightsHolder] = useState("");
  const [license, setLicense] = useState<string>(LICENSES[0]);
  const [preview, setPreview] = useState<{ json: string; cid: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const meta = buildMoveMetadata({ move, discipline, rightsHolder, license, token, amount });
  const json = serializeMetadata(meta);

  // Any edit (including token/amount) invalidates a confirmed CID.
  useEffect(() => {
    if (preview && preview.json !== json) {
      setPreview(null);
      onReset();
    }
  }, [json, preview, onReset]);

  async function onPreview() {
    setBusy(true);
    try {
      const next = await computeCid(json);
      setPreview({ json, cid: next });
    } finally {
      setBusy(false);
    }
  }

  const confirmed = Boolean(cid && preview && cid === preview.cid);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
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

      {preview ? (
        <div className="space-y-3">
          <pre className="max-h-64 overflow-auto rounded-lg border border-border/60 bg-surface p-3 text-[11px] leading-relaxed text-muted-foreground">
            {preview.json}
          </pre>
          <div className="rounded-lg border border-border/60 bg-surface px-3 py-2">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Resulting IPFS CID</p>
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
          {busy ? "Hashing…" : "Preview metadata & CID"}
        </button>
      )}
    </div>
  );
}
