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

export const Route = createFileRoute("/product/$handle")({
  component: ProductPage,
});

function ProductPage() {
  useCartSync();
  const { handle } = Route.useParams();
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
      <main className="min-h-screen bg-[#0a0a0a] grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1DB954]" />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white grid place-items-center px-4">
        <div className="text-center">
          <p className="text-neutral-400">Product not found.</p>
          <Link to="/shop" className="mt-4 inline-block text-[#1DB954] font-bold">
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

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-4xl px-5 py-10 space-y-8">
        <header className="flex items-center justify-between">
          <Link to="/shop" className="text-xs font-bold text-neutral-400 hover:text-white">
            ← Shop
          </Link>
          <CartDrawer />
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800">
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
              <h1 className="text-3xl font-black">{product.title}</h1>
              <p className="mt-2 text-2xl font-black text-[#1DB954]">
                {variant?.price.currencyCode}{" "}
                {parseFloat(variant?.price.amount ?? "0").toFixed(2)}
              </p>
            </div>
            <p className="text-sm text-neutral-400 whitespace-pre-line">
              {product.description}
            </p>

            {variants.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                  Options
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v: any, i: number) => (
                    <button
                      key={v.node.id}
                      onClick={() => setVariantIdx(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                        i === variantIdx
                          ? "border-[#1DB954] bg-[#1DB954]/10 text-[#1DB954]"
                          : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                      }`}
                    >
                      {v.node.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Quantity
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-2 py-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-40"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-8 text-center text-sm font-bold tabular-nums">
                  {qty}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  onClick={() => setQty((q) => q + 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <Button
              onClick={handleAdd}
              disabled={isLoading || !variant?.availableForSale}
              className="w-full bg-[#1DB954] text-black hover:bg-[#1ed760] font-bold h-12 rounded-full"
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
