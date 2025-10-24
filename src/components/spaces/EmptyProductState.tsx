import { Package, Plus, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyProductStateProps {
  onCreateProduct: () => void;
}

export default function EmptyProductState({
  onCreateProduct,
}: EmptyProductStateProps) {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6">
        <div className="rounded-full bg-primary/10 p-6 mb-6">
          <Package className="h-16 w-16 text-primary" />
        </div>

        <h3 className="text-2xl font-bold mb-2">Aucun produit</h3>
        <p className="text-muted-foreground text-center mb-8 max-w-md">
          Commencez par créer votre premier produit pour gérer votre inventaire et vos articles.
        </p>

        <Button onClick={onCreateProduct} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Créer mon premier produit
        </Button>

        <div className="mt-12 grid gap-4 md:grid-cols-3 max-w-3xl">
          <div className="flex flex-col items-center text-center p-4">
            <div className="rounded-full bg-blue-100 p-3 mb-3">
              <Lightbulb className="h-5 w-5 text-blue-600" />
            </div>
            <h4 className="font-semibold text-sm mb-1">Gestion simplifiée</h4>
            <p className="text-xs text-muted-foreground">
              Créez et gérez vos produits avec des informations détaillées
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-4">
            <div className="rounded-full bg-green-100 p-3 mb-3">
              <Lightbulb className="h-5 w-5 text-green-600" />
            </div>
            <h4 className="font-semibold text-sm mb-1">Track Déchet</h4>
            <p className="text-xs text-muted-foreground">
              Activez le suivi Track Déchets pour vos produits réglementés
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-4">
            <div className="rounded-full bg-amber-100 p-3 mb-3">
              <Lightbulb className="h-5 w-5 text-amber-600" />
            </div>
            <h4 className="font-semibold text-sm mb-1">Favoris</h4>
            <p className="text-xs text-muted-foreground">
              Marquez vos produits favoris pour un accès rapide
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
