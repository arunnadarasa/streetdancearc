import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import type { ShopifyProduct } from "@/lib/shopify";

export function ProductCard({ product }: { product: ShopifyProduct }) {
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const variant = product.node.variants.edges[0]?.node;
  const img = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });
    toast.success(`${product.node.title} added to cart`, { position: "top-center" });
  };

  return (
    <Link
      to="/product/$handle"
      params={{ handle: product.node.handle }}
      className="group rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-hidden hover:border-[#1DB954]/50 transition-colors"
    >
      <div className="aspect-square bg-neutral-800/50 overflow-hidden">
        {img ? (
          <img
            src={img.url}
            alt={img.altText || product.node.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-neutral-700">
            <ShoppingBag className="h-12 w-12" />
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-white truncate">{product.node.title}</h3>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[#1DB954] font-black">
            {price.currencyCode} {parseFloat(price.amount).toFixed(2)}
          </span>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={isLoading || !variant}
            className="bg-white text-black hover:bg-neutral-200 h-8 rounded-full text-xs font-bold"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
          </Button>
        </div>
      </div>
    </Link>
  );
}
