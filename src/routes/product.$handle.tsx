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
import { ModeToggle } from "@/components/gx/ModeToggle";
import { GxOffer } from "@/components/gx/GxOffer";
import { useGxMode } from "@/lib/gx-mode";
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
        <main className="min-h-screen bg-background text-foreground">
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-6 sm:px-5 sm:py-10">
            <div className="flex justify-end">
              <ModeToggle />
            </div>
            <GxOffer product={product} />
          </div>
        </main>
      </PrivyRoot>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6 sm:px-5 sm:py-10 sm:space-y-8">
        <header className="flex items-center justify-between">
          <Link to="/shop" className="text-xs font-bold text-muted-foreground hover:text-foreground">
            ← Shop
          </Link>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <CartDrawer />
          </div>
        </header>


        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          <div className="aspect-square bg-surface rounded-2xl overflow-hidden border border-border">
            {img && (
              <img
                src={img.url}
                alt={img.altText || product.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">{product.title}</h1>
              <p className="mt-2 text-xl font-black text-glow sm:text-2xl">
                {variant?.price.currencyCode}{" "}
                {parseFloat(variant?.price.amount ?? "0").toFixed(2)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {product.description}
            </p>

            {variants.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Options
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v: any, i: number) => (
                    <button
                      key={v.node.id}
                      onClick={() => setVariantIdx(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                        i === variantIdx
                          ? "border-primary bg-primary/10 text-glow"
                          : "border-border text-muted-foreground hover:border-neutral-500"
                      }`}
                    >
                      {v.node.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Quantity
              </p>
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
                <span className="w-8 text-center text-sm font-bold tabular-nums">
                  {qty}
                </span>
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
              className="w-full bg-primary text-black hover:bg-primary/85 font-bold h-12 rounded-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : variant?.availableForSale ? (
                "Add to cart"
              ) : (
                "Sold out"
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
