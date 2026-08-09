import BufferModule from "buffer";

const BufferCtor =
  (BufferModule as { Buffer?: typeof globalThis.Buffer }).Buffer ??
  (BufferModule as unknown as typeof globalThis.Buffer);

(globalThis as unknown as { Buffer: typeof globalThis.Buffer }).Buffer =
  (globalThis as unknown as { Buffer?: typeof globalThis.Buffer }).Buffer ?? BufferCtor;

import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
