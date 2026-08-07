// Thin server-function wrappers for the ERC-1271 authorizer.
// Runtime logic lives in erc1271.server.ts (server-fn splitting requirement).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { describeAuthorizer, verify1271 } from "@/lib/erc1271.server";

export const getAuthorizer = createServerFn({ method: "GET" }).handler(async () =>
  describeAuthorizer(),
);

export const checkAuthorization = createServerFn({ method: "GET" })
  .inputValidator((input: { hash: string; signature?: string }) =>
    z
      .object({
        hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
        signature: z.string().regex(/^0x[0-9a-fA-F]*$/).max(600).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) =>
    verify1271(
      data.hash as `0x${string}`,
      (data.signature ?? "0x") as `0x${string}`,
    ),
  );
