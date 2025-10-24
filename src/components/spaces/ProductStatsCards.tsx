import { Package, Star, Recycle, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/lib/database";

interface ProductStatsCardsProps {
  products: Product[];
  onStatClick: (filterType: string) => void;
}

export default function ProductStatsCards({
  products,
  onStatClick,
}: ProductStatsCardsProps) {
  const totalProducts = products.length;
  const favoriteProducts = products.filter((p) => p.isFavorite).length;
  const trackDechetProducts = products.filter((p) => p.trackDechetEnabled).length;
  const avgPrice = products.length > 0
    ? products.reduce((acc, p) => acc + (p.prixTTC || 0), 0) / products.length
    : 0;

  const stats = [
    {
      title: "Total Produits",
      value: totalProducts,
      icon: Package,
      trend: null,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      hoverColor: "hover:bg-blue-100",
      filterType: "all",
    },
    {
      title: "Favoris",
      value: favoriteProducts,
      icon: Star,
      trend: null,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      hoverColor: "hover:bg-amber-100",
      filterType: "favorites",
    },
    {
      title: "Track Déchet",
      value: trackDechetProducts,
      icon: Recycle,
      trend: null,
      color: "text-green-600",
      bgColor: "bg-green-50",
      hoverColor: "hover:bg-green-100",
      filterType: "trackDechet",
    },
    {
      title: "Prix Moyen TTC",
      value: `${avgPrice.toFixed(2)}€`,
      icon: TrendingUp,
      trend: null,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      hoverColor: "hover:bg-purple-100",
      filterType: "none",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            stat.filterType !== "none" ? stat.hoverColor : ""
          }`}
          onClick={() => stat.filterType !== "none" && onStatClick(stat.filterType)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <h3 className="text-2xl font-bold mt-2">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
