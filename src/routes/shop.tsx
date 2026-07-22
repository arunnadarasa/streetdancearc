import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { STOREFRONT_QUERY, storefrontApiRequest, type ShopifyProduct } from "@/lib/shopify";
import { ProductCard } from "@/components/shop/ProductCard";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { useCartSync } from "@/hooks/useCartSync";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/shop")({
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
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6 sm:px-5 sm:py-10 sm:space-y-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1DB954] text-black font-black">
              ♪
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight sm:text-xl">StreetKode Merch</h1>
              <p className="hidden truncate text-xs text-neutral-500 sm:block">Street dance culture · Physical drops</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              to="/"
              className="text-xs font-bold text-neutral-400 hover:text-white"
            >
              ← Tokens
            </Link>
            <CartDrawer />
          </div>
        </header>

        <section className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-[#1DB954]/20 via-neutral-900 to-black p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1DB954]">
            Fresh drop
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
            Wear the culture.<br />Move the streets.
          </h2>
          <p className="mt-3 max-w-md text-sm text-neutral-400">
            Sneakers, snapbacks, baseball jackets, trousers, socks, tees, bandanas —
            built for cyphers, battles and everyday flex.
          </p>
        </section>

        {loading ? (
          <div className="grid place-items-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#1DB954]" />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 p-12 text-center">
            <p className="text-neutral-400">No products found.</p>
            <p className="mt-2 text-xs text-neutral-600">
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

        <footer className="pt-6 text-center text-xs text-neutral-500">
          Built during the Creative AI &amp; Quantum Hackathon organised by StreetKode Fam
          during Indian Krump Festival 14
        </footer>
      </div>
    </main>
  );
}
