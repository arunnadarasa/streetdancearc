// Thin server-function wrapper for the registry receipt history.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { readReceipts } from "@/lib/receipts.server";

export const listReceipts = createServerFn({ method: "GET" })
  .inputValidator((input?: { limit?: number }) =>
    z.object({ limit: z.number().int().min(1).max(50).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => readReceipts(data.limit ?? 25));
