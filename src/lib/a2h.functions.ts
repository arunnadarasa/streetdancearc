// Thin server-function wrappers for the A2H payout engine.
// All runtime logic lives in a2h.server.ts (server-fn splitting requirement).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TOKEN_KEYS, type TokenKey } from "@/lib/tokens";
import {
  runPushPayout,
  runApprovePayout,
  runListPayouts,
  runAccruePayout,
  runSettleBatch,
  runListAccruals,
} from "@/lib/a2h-engine.server";

const TokenEnum = z.enum(TOKEN_KEYS as [TokenKey, ...TokenKey[]]);
const AddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/);

export const listPayouts = createServerFn({ method: "GET" })
  .inputValidator((input: { address?: string }) =>
    z.object({ address: AddressSchema.optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => runListPayouts(data.address));

export const listAccruals = createServerFn({ method: "GET" })
  .inputValidator((input: { address?: string }) =>
    z.object({ address: AddressSchema.optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => runListAccruals(data.address));

export const accruePayout = createServerFn({ method: "POST" })
  .inputValidator((input: { address: string; token: TokenKey; moveCid: string; plays: number }) =>
    z
      .object({
        address: AddressSchema,
        token: TokenEnum,
        moveCid: z.string().min(1).max(120),
        plays: z.number().int().min(1).max(100_000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => runAccruePayout(data));

export const settleBatch = createServerFn({ method: "POST" })
  .inputValidator((input: { address: string; token: TokenKey; moveCid: string }) =>
    z
      .object({
        address: AddressSchema,
        token: TokenEnum,
        moveCid: z.string().min(1).max(120),
      })
      .parse(input),
  )
  .handler(async ({ data }) => runSettleBatch(data));

export const pushPayout = createServerFn({ method: "POST" })
  .inputValidator((input: { address: string; token: TokenKey; moveCid: string; plays: number }) =>
    z
      .object({
        address: AddressSchema,
        token: TokenEnum,
        moveCid: z.string().min(1).max(120),
        plays: z.number().int().min(1).max(100_000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => runPushPayout(data));

export const approvePayout = createServerFn({ method: "POST" })
  .inputValidator((input: { address: string; token: TokenKey; moveCid: string; usd: number }) =>
    z
      .object({
        address: AddressSchema,
        token: TokenEnum,
        moveCid: z.string().min(1).max(120),
        usd: z.number().min(0).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data }) => runApprovePayout(data));
