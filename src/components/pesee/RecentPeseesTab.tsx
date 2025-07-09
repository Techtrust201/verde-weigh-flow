
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pesee } from '@/lib/database';

interface RecentPeseesTabProps {
  pesees: Pesee[];
}

export const RecentPeseesTab = ({ pesees }: RecentPeseesTabProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pesées récentes</h3>
      {pesees.map((pesee) => (
        <Card key={pesee.id}>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="font-semibold">{pesee.numeroBon}</div>
                <div className="text-sm text-gray-600">
                  {pesee.dateHeure.toLocaleDateString()} à {pesee.dateHeure.toLocaleTimeString()}
                </div>
              </div>
              <div>
                <div className="font-medium">{pesee.nomEntreprise}</div>
                <div className="text-sm text-gray-600">Plaque: {pesee.plaque}</div>
              </div>
              <div>
                <Badge variant="outline" className="mb-2">
                  {pesee.net.toFixed(3)} tonnes
                </Badge>
                <div className="text-sm text-gray-600">
                  {pesee.moyenPaiement}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-green-600">
                  {pesee.prixTTC.toFixed(2)}€ TTC
                </div>
                <Badge variant={pesee.synchronized ? "default" : "secondary"}>
                  {pesee.synchronized ? "Synchronisé" : "En attente"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
