import { Card, CardContent } from "@/components/ui/card";
import { FileX, Sparkles } from "lucide-react";

export function TrackDechetEmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-primary/10 p-6 mb-4">
          <FileX className="h-12 w-12 text-primary/60" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Aucun BSD trouvé</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Les bordereaux de suivi des déchets apparaîtront ici une fois que vous aurez créé des pesées
          avec Track Déchet activé.
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>Les BSD sont créés automatiquement lors de la pesée</span>
        </div>
      </CardContent>
    </Card>
  );
}
