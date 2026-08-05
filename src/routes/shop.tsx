import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { STOREFRONT_QUERY, storefrontApiRequest, type ShopifyProduct } from "@/lib/shopify";
import { ProductCard } from "@/components/shop/ProductCard";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { useCartSync } from "@/hooks/useCartSync";
import { Loader2 } from "lucide-react";
import { PrivyRoot } from "@/components/PrivyRoot";
import { Header } from "@/components/dance/Header";
import { Section, SectionHead } from "@/components/layout/Section";
import { Reveal } from "@/components/layout/Reveal";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GxShop } from "@/components/gx/GxShop";
import { useGxMode } from "@/lib/gx-mode";
import { H2aHome } from "@/components/h2a/H2aHome";
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
      <div className="min-h-screen bg-background text-foreground">
        <Header extra={mode === "h2h" ? <CartDrawer /> : undefined} />

        {mode !== "h2h" ? (
          <Section tone="base" lines>
            {mode === "h2a" ? <H2aHome /> : <GxShop />}
          </Section>
        ) : (

          <>
            <section className="aurora-bg relative">
              <div className="rail relative flex min-h-[40vh] flex-col justify-center py-12 sm:min-h-[52vh] sm:py-24">
                <Reveal>
                  <p className="eyebrow">Fresh drop · StreetKode Merch</p>
                </Reveal>
                <Reveal delay={90}>
                  <h1 className="display mt-5 text-[clamp(2.1rem,8.5vw,3rem)] leading-[0.95] sm:text-6xl lg:text-7xl">
                    <span className="block text-foreground">Wear the culture.</span>
                    <span className="block text-gradient">Move the streets.</span>
                  </h1>
                </Reveal>
                <Reveal delay={170}>
                  <p className="mt-6 max-w-xl text-base text-muted-foreground">
                    Sneakers, snapbacks, baseball jackets, trousers, socks, tees and bandanas —
                    built for cyphers, battles and everyday flex.
                  </p>
                </Reveal>
              </div>
            </section>

            <Section tone="raised">
              {loading ? (
                <div className="grid place-items-center py-24">
                  <Loader2 className="h-8 w-8 animate-spin text-glow" />
                </div>
              ) : products.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border p-12 text-center">
                  <p className="text-muted-foreground">No products found.</p>
                  <p className="mt-2 text-xs text-muted-foreground/70">
                    Tell the chat what to add (e.g. "add a £120 Krump Kicks sneaker").
                  </p>
                </div>
              ) : (
                <>
                  <Reveal>
                    <SectionHead
                      eyebrow={`${products.length} pieces in the drop`}
                      title="The rack"
                      blurb="Physical goods, Shopify-fulfilled. Agents can buy the same catalogue over x402 in GX mode."
                    />
                  </Reveal>
                  <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
                    {products.map((p, i) => (
                      <Reveal key={p.node.id} delay={Math.min(i, 7) * 70}>
                        <ProductCard product={p} />
                      </Reveal>
                    ))}
                  </div>
                </>
              )}
            </Section>
          </>
        )}

        <SiteFooter />
      </div>
    </PrivyRoot>
  );
}

