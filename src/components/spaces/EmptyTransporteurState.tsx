import { Truck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyTransporteurStateProps {
  onCreateTransporteur: () => void;
}

export default function EmptyTransporteurState({
  onCreateTransporteur,
}: EmptyTransporteurStateProps) {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Truck className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Aucun transporteur</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Commencez par ajouter votre premier transporteur pour gérer vos livraisons et transports.
        </p>
        <Button onClick={onCreateTransporteur} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Créer mon premier transporteur
        </Button>
      </CardContent>
    </Card>
  );
}
