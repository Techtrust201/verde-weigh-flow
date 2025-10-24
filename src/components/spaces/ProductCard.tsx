import { Package, Star, Edit, Trash2, MoreVertical } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Product } from "@/lib/database";
import { TrackDechetBadge } from "@/components/ui/track-dechet-badge";

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelect: (productId: number) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
}

export default function ProductCard({
  product,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
}: ProductCardProps) {
  const getCategorieColor = (categorie?: string) => {
    switch (categorie) {
      case "inerte":
        return "bg-gray-100 text-gray-700";
      case "non-dangereux":
        return "bg-blue-100 text-blue-700";
      case "dangereux":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 animate-fade-in">
      <div className="absolute top-3 left-3 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(product.id!)}
          className="bg-background shadow-sm"
        />
      </div>

      <CardContent className="p-6 pt-12">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg line-clamp-1">
                {product.nom}
              </h3>
              {product.isFavorite && (
                <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Code: {product.codeProduct}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleFavorite(product)}>
                <Star className="h-4 w-4 mr-2" />
                {product.isFavorite ? "Retirer favori" : "Marquer favori"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(product)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-2xl font-bold text-primary">
                {product.prixTTC?.toFixed(2) || "0.00"}€
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                HT: {product.prixHT?.toFixed(2) || "0.00"}€ • TVA: {product.tauxTVA || 0}%
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-xs">
                {product.unite || "tonne"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
        {product.categorieDechet && (
          <Badge className={getCategorieColor(product.categorieDechet)}>
            {product.categorieDechet === "non-dangereux"
              ? "Non-dangereux"
              : product.categorieDechet === "dangereux"
              ? "Dangereux"
              : "Inerte"}
          </Badge>
        )}
        {product.trackDechetEnabled && (
          <TrackDechetBadge variant="product" enabled={product.trackDechetEnabled} />
        )}
        {product.codeDechets && (
          <Badge variant="outline" className="text-xs">
            {product.codeDechets}
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
