import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Search } from "lucide-react";
import { Pesee, Product } from "@/lib/database";
import { useState } from "react";

interface ExportPreviewTableProps {
  pesees: Pesee[];
  products: Product[];
  selectedIds: Set<number>;
  onToggleSelection: (id: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export default function ExportPreviewTable({
  pesees,
  products,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
}: ExportPreviewTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPesees = pesees.filter(
    (pesee) =>
      pesee.nomEntreprise?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pesee.numeroBon?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par client ou n° bon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSelectAll}>
            <Check className="h-4 w-4 mr-1" />
            Tout sélectionner
          </Button>
          <Button variant="outline" size="sm" onClick={onDeselectAll}>
            <X className="h-4 w-4 mr-1" />
            Désélectionner
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>N° Bon</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead className="text-right">Quantité</TableHead>
              <TableHead className="text-right">Prix TTC</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPesees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Aucune pesée trouvée
                </TableCell>
              </TableRow>
            ) : (
              filteredPesees.map((pesee) => {
                const product = products.find((p) => p.id === pesee.produitId);
                return (
                  <TableRow
                    key={pesee.id}
                    className={
                      selectedIds.has(pesee.id!)
                        ? "bg-primary/5"
                        : ""
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(pesee.id!)}
                        onCheckedChange={() => onToggleSelection(pesee.id!)}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(pesee.dateHeure).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="font-medium">{pesee.numeroBon}</TableCell>
                    <TableCell>{pesee.nomEntreprise}</TableCell>
                    <TableCell>{product?.nom || "N/A"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {pesee.net?.toFixed(2)} t
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {pesee.prixTTC?.toFixed(2)} €
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          pesee.exportedAt && pesee.exportedAt.length > 0
                            ? "secondary"
                            : "default"
                        }
                      >
                        {pesee.exportedAt && pesee.exportedAt.length > 0
                          ? "Exporté"
                          : "Nouveau"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
