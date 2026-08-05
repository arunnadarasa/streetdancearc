import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  PRODUCT_BY_HANDLE_QUERY,
  storefrontApiRequest,
} from "@/lib/shopify";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { useCartStore } from "@/stores/cartStore";
import { useCartSync } from "@/hooks/useCartSync";
import { Button } from "@/components/ui/button";
import { Loader2, Minus, Plus } from "lucide-react";
import { PrivyRoot } from "@/components/PrivyRoot";
import { Header } from "@/components/dance/Header";
import { Section } from "@/components/layout/Section";
import { Reveal } from "@/components/layout/Reveal";
import { SiteFooter } from "@/components/layout/SiteFooter";

import { GxOffer } from "@/components/gx/GxOffer";
import { useGxMode } from "@/lib/gx-mode";
import { H2aHome } from "@/components/h2a/H2aHome";
import { getPublicConfig } from "@/lib/config.functions";

export const Route = createFileRoute("/product/$handle")({
  loader: () => getPublicConfig(),
  component: ProductPage,
});

function ProductPage() {
  useCartSync();
  const { handle } = Route.useParams();
  const { privyAppId } = Route.useLoaderData();
  const [mode] = useGxMode();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [variantIdx, setVariantIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);

  useEffect(() => {
    setQty(1);
  }, [variantIdx]);


  useEffect(() => {
    (async () => {
      try {
        const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
        setProduct(data?.data?.product ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [handle]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-glow" />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-background text-foreground grid place-items-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground">Product not found.</p>
          <Link to="/shop" className="mt-4 inline-block text-glow font-bold">
            ← Back to shop
          </Link>
        </div>
      </main>
    );
  }

  const variants = product.variants.edges;
  const variant = variants[variantIdx]?.node;
  const img = product.images.edges[0]?.node;

  const handleAdd = async () => {
    if (!variant) return;
    const productWrapper = { node: product };
    await addItem({
      product: productWrapper,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: qty,
      selectedOptions: variant.selectedOptions || [],
    });
    toast.success(`${qty} × ${product.title} added to cart`, { position: "top-center" });
  };

  if (mode === "gx") {
    return (
      <PrivyRoot appId={privyAppId}>
        <div className="min-h-screen bg-background text-foreground">
          <Header />
          <Section tone="base" lines>
            <GxOffer product={product} />
          </Section>
          <SiteFooter />
        </div>
      </PrivyRoot>
    );
  }

  return (
    <PrivyRoot appId={privyAppId}>
      <div className="min-h-screen bg-background text-foreground">
        <Header extra={<CartDrawer />} />

        <section className="aurora-bg relative">
          <div className="rail relative grid gap-8 py-12 sm:py-16 md:grid-cols-2 md:gap-12">
            <Reveal>
              <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-border bg-surface shadow-elevated">
                {img ? (
                  <img
                    src={img.url}
                    alt={img.altText || product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-linear-to-br from-indigo-950 via-slate-900 to-indigo-900">
                    <div className="flex flex-col items-center gap-4 text-indigo-200/60">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-500/10 backdrop-blur">
                        <span className="display text-3xl">{product.title?.charAt(0) || "S"}</span>
                      </div>
                      <span className="max-w-[70%] text-center text-xs font-bold uppercase tracking-widest">
                        {product.title}
                      </span>
                    </div>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-foreground/10" />
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="space-y-7">
                <Link
                  to="/shop"
                  className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                >
                  ← Back to the rack
                </Link>
                <div>
                  <h1 className="display text-[clamp(1.75rem,7vw,2.5rem)] leading-[1.02] sm:text-5xl">{product.title}</h1>
                  <p className="display mt-4 text-3xl text-gradient sm:text-4xl">
                    {variant?.price.currencyCode}{" "}
                    {parseFloat(variant?.price.amount ?? "0").toFixed(2)}
                  </p>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>

                {variants.length > 1 && (
                  <div className="space-y-3">
                    <p className="eyebrow">Options</p>
                    <div className="flex flex-wrap gap-2">
                      {variants.map((v: any, i: number) => (
                        <button
                          key={v.node.id}
                          onClick={() => setVariantIdx(i)}
                          className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                            i === variantIdx
                              ? "border-primary/70 bg-primary/15 text-foreground glow-ring"
                              : "border-border text-muted-foreground hover:border-primary/60"
                          }`}
                        >
                          {v.node.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="eyebrow">Quantity</p>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-2 py-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center text-sm font-bold tabular-nums">{qty}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                      onClick={() => setQty((q) => q + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleAdd}
                  disabled={isLoading || !variant?.availableForSale}
                  className="lift h-13 w-full rounded-full bg-linear-to-r from-primary to-glow py-4 text-sm font-bold text-primary-foreground shadow-glow"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : variant?.availableForSale ? (
                    "Add to cart"
                  ) : (
                    "Sold out"
                  )}
                </Button>
              </div>
            </Reveal>
          </div>
        </section>

        <SiteFooter />
      </div>
    </PrivyRoot>
  );
}

