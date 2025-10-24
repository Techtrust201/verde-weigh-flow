import { Product } from "@/lib/database";
import ProductCard from "./ProductCard";

interface ProductCardGridProps {
  products: Product[];
  selectedProductIds: Set<number>;
  onSelect: (productId: number) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
}

export default function ProductCardGrid({
  products,
  selectedProductIds,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
}: ProductCardGridProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isSelected={selectedProductIds.has(product.id!)}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
