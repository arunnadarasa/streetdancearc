import { createServerFn } from "@tanstack/react-start";

function normalizeHash(h: string): string {
  return h.replace(/^0x/i, "").toLowerCase();
}

function isHex64(h: string): boolean {
  return /^[0-9a-f]{64}$/.test(normalizeHash(h));
}

/**
 * Confirmation state for settlement hashes via the local Midnight indexer.
 * (Legacy Arcscan polling removed after the Undeployed pivot.)
 */
export const fetchTxStatuses = createServerFn({ method: "POST" })
  .inputValidator((data: { hashes: string[] }) => ({
    hashes: (data?.hashes ?? []).filter(isHex64).slice(0, 25),
  }))
  .handler(async ({ data }) => {
    const indexer =
      process.env["VITE_INDEXER_URL"] || "http://localhost:8088/api/v4/graphql";

    const results = await Promise.all(
      data.hashes.map(async (hash) => {
        const hex = normalizeHash(hash);
        try {
          const res = await fetch(indexer, {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify({
              query:
                "query($h: HexEncoded!){ transactions(offset: { hash: $h }) { hash block { height } } }",
              variables: { h: hex },
            }),
          });
          if (!res.ok) return { hash, status: "pending" as const };
          const json = (await res.json()) as {
            data?: { transactions?: Array<{ hash?: string; block?: { height?: number } }> };
            errors?: unknown;
          };
          const row = json.data?.transactions?.[0];
          if (row?.hash && row.block?.height != null) {
            return { hash, status: "success" as const };
          }
          if (row?.hash) return { hash, status: "success" as const };
          return { hash, status: "pending" as const };
        } catch {
          return { hash, status: "pending" as const };
        }
      }),
    );
    return { results };
  });
