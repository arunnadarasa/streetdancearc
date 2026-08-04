import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { STOREFRONT_QUERY, storefrontApiRequest, type ShopifyProduct } from "@/lib/shopify";
import { ProductCard } from "@/components/shop/ProductCard";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { useCartSync } from "@/hooks/useCartSync";
import { Loader2 } from "lucide-react";
import { PrivyRoot } from "@/components/PrivyRoot";
import { ModeToggle } from "@/components/gx/ModeToggle";
import { GxShop } from "@/components/gx/GxShop";
import { useGxMode } from "@/lib/gx-mode";
import { getPublicConfig } from "@/lib/config.functions";

export const Route = createFileRoute("/shop")({
  loader: () => getPublicConfig(),

  head: () => ({
    meta: [
      { title: "Shop — StreetKode Fam Merch" },
      {
        name: "description",
        content:
          "Street dance merchandise: sneakers, snapbacks, jackets, tees, bandanas and more. Crafted for cyphers, battles and the culture.",
      },
      { property: "og:title", content: "Shop — StreetKode Fam Merch" },
      {
        property: "og:description",
        content: "Street dance culture merch. Sneakers, snapbacks, jackets & more.",
      },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  useCartSync();
  const { privyAppId } = Route.useLoaderData();
  const [mode] = useGxMode();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await storefrontApiRequest(STOREFRONT_QUERY, { first: 24 });
        setProducts(data?.data?.products?.edges ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PrivyRoot appId={privyAppId}>
    <main className="min-h-screen bg-background text-foreground">

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6 sm:px-5 sm:py-10 sm:space-y-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-black font-black">
              ♪
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight sm:text-xl">StreetKode Merch</h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">Street dance culture · Physical drops</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ModeToggle />
            <Link
              to="/"
              className="hidden text-xs font-bold text-muted-foreground hover:text-foreground sm:inline"
            >
              ← Tokens
            </Link>
            {mode === "h2h" && <CartDrawer />}
          </div>
        </header>

        {mode === "gx" ? (
          <GxShop />
        ) : (
          <>
            <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/25 via-surface to-black p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-glow">
                Fresh drop
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                Wear the culture.<br />Move the streets.
              </h2>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">
                Sneakers, snapbacks, baseball jackets, trousers, socks, tees, bandanas —
                built for cyphers, battles and everyday flex.
              </p>
            </section>

            {loading ? (
              <div className="grid place-items-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-glow" />
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <p className="text-muted-foreground">No products found.</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tell the chat what to add (e.g. "add a £120 Krump Kicks sneaker").
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((p) => (
                  <ProductCard key={p.node.id} product={p} />
                ))}
              </div>
            )}
          </>
        )}

        <footer className="pt-6 text-center text-xs text-muted-foreground">
          Built during the Creative AI &amp; Quantum Hackathon organised by StreetKode Fam
          during Indian Krump Festival 14
        </footer>
      </div>
    </main>
    </PrivyRoot>
  );

}
