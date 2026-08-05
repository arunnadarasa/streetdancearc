// src/lib/fx.functions.ts - thin server-function wrapper around the live FX feed.
// Client components import this; the heavy fetch logic lives in fx.server.ts.

import { createServerFn } from "@tanstack/react-start";
import { getFxRates } from "./fx.server";

export const fetchFxRates = createServerFn({ method: "GET" }).handler(async () => {
  return getFxRates();
});
