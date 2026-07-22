## Problem

Clicking "Tokens" on `/shop` triggers TanStack Router client-side navigation to `/`. The `/` route loader is:

```ts
loader: () => ({
  privyAppId: process.env.PRIVY_APP_ID,
  treasuryAddress: process.env.CIRCLE_TREASURY_ADDRESS,
})
```

Route loaders run on **both** the server (initial SSR) and the client (subsequent navigations). `process.env.*` is only defined on the server, so on client nav the values are `undefined` and `PrivyClientEntry` renders the "Missing PRIVY_APP_ID" screen.

Loading `/` directly works because SSR runs the loader server-side; navigating from `/shop` breaks it.

## Fix

Move env reads into a `createServerFn` so they always execute server-side, and call it from the loader.

### Changes

1. Create `src/lib/config.functions.ts`:
   ```ts
   import { createServerFn } from "@tanstack/react-start";
   export const getPublicConfig = createServerFn({ method: "GET" }).handler(async () => ({
     privyAppId: process.env.PRIVY_APP_ID ?? "",
     treasuryAddress: process.env.CIRCLE_TREASURY_ADDRESS ?? "",
   }));
   ```

2. Update `src/routes/index.tsx` loader to `loader: () => getPublicConfig()` (keep the same `Route.useLoaderData()` shape in the component).

No UI changes.