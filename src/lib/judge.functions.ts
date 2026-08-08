// Server helpers for the guided judge run.
//
// The A2A step performs a real x402 handshake against StreetRail's own
// merchant endpoint and returns the 402 challenge verbatim, so a judge sees
// the machine-readable quote the buyer agent would settle against.

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { TOKEN_KEYS, type TokenKey } from "@/lib/tokens";

export const fetchX402Challenge = createServerFn({ method: "POST" })
  .inputValidator((input: { token?: TokenKey }) =>
    z
      .object({ token: z.enum(TOKEN_KEYS as [TokenKey, ...TokenKey[]]).default("USDC") })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const origin = process.env["PUBLIC_ORIGIN"] || new URL(getRequest().url).origin;

    const body = {
      sku: "streetrail-snapback",
      quantity: 1,
      listedAmount: 34,
      currency: "GBP",
      token: data.token,
      agentId: "judge-run-buyer-agent",
    };

    let res: Response;
    try {
      res = await fetch(`${origin}/api/public/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12_000),
      });
    } catch (e) {
      return {
        ok: false as const,
        status: 0,
        detail: e instanceof Error ? e.message : "The merchant endpoint did not respond.",
        request: body,
        challenge: null,
      };
    }

    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      /* keep null */
    }

    return {
      ok: res.status === 402,
      status: res.status,
      detail:
        res.status === 402
          ? null
          : `Expected a 402 payment challenge, got ${res.status}.`,
      request: body,
      challenge: payload,
    };
  });
