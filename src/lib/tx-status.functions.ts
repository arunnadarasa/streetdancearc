import { createServerFn } from "@tanstack/react-start";

/**
 * Confirmation state for settlement hashes, read from the Arcscan (Blockscout)
 * REST API so the judge-facing list reflects the chain, not just local state.
 */
export const fetchTxStatuses = createServerFn({ method: "POST" })
  .inputValidator((data: { hashes: string[] }) => ({
    hashes: (data?.hashes ?? []).filter((h) => /^0x[0-9a-fA-F]{64}$/.test(h)).slice(0, 25),
  }))
  .handler(async ({ data }) => {
    const explorer = "https://testnet.arcscan.app";
    const results = await Promise.all(
      data.hashes.map(async (hash) => {
        try {
          const res = await fetch(`${explorer}/api/v2/transactions/${hash}`, {
            headers: { accept: "application/json" },
          });
          if (!res.ok) return { hash, status: "pending" as const };
          const json = (await res.json()) as { status?: string; result?: string };
          if (json.status === "ok") return { hash, status: "success" as const };
          if (json.status === "error") return { hash, status: "failed" as const };
          return { hash, status: "pending" as const };
        } catch {
          return { hash, status: "pending" as const };
        }
      }),
    );
    return { results };
  });
