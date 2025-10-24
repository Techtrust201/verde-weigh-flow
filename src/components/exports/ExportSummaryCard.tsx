import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Calendar, Package, DollarSign } from "lucide-react";
import { ExportFormat } from "@/hooks/useExportData";
import { ExportType } from "@/hooks/useExportWizard";

interface ExportSummaryCardProps {
  exportType: ExportType | null;
  format: ExportFormat | null;
  startDate: string;
  endDate: string;
  selectedCount: number;
  totalCount: number;
  totalAmount?: number;
  templateName?: string;
}

export default function ExportSummaryCard({
  exportType,
  format,
  startDate,
  endDate,
  selectedCount,
  totalCount,
  totalAmount,
  templateName,
}: ExportSummaryCardProps) {
  const getExportTypeLabel = (type: ExportType | null) => {
    switch (type) {
      case "new":
        return "Nouveaux BL uniquement";
      case "selective":
        return "Période sélectionnée";
      case "complete":
        return "Toutes les données";
      default:
        return "Non défini";
    }
  };

  const getFormatLabel = (fmt: ExportFormat | null) => {
    switch (fmt) {
      case "csv":
        return "CSV Standard (.csv)";
      case "csv-txt":
        return "CSV Standard (.txt)";
      case "sage-articles":
        return "Sage 50 Articles";
      case "sage-ventes":
        return "Sage 50 Ventes";
      case "sage-bl-complet":
        return "Sage 50 BL Complets";
      case "sage-template":
        return templateName || "Template personnalisé";
      default:
        return "Non défini";
    }
  };

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="text-lg">Résumé de l'export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Type d'export</p>
              <Badge variant="outline" className="mt-1">
                {getExportTypeLabel(exportType)}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Format</p>
              <Badge variant="outline" className="mt-1">
                {getFormatLabel(format)}
              </Badge>
            </div>
          </div>

          {exportType !== "complete" && startDate && endDate && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Période</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(startDate).toLocaleDateString("fr-FR")} -{" "}
                    {new Date(endDate).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pesées disponibles</span>
              <span className="text-sm font-medium">{totalCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Sélectionnées</span>
              <span className="text-2xl font-bold text-primary">{selectedCount}</span>
            </div>
            {totalAmount !== undefined && (
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-muted-foreground">Montant total</span>
                <span className="text-lg font-bold text-primary">
                  {totalAmount.toFixed(2)} €
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
