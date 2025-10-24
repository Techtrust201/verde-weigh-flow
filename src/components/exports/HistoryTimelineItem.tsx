import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Trash2, FileText } from "lucide-react";
import { ExportLog } from "@/hooks/useExportData";

interface HistoryTimelineItemProps {
  log: ExportLog;
  onDownload: (log: ExportLog) => void;
  onDelete: (id: number) => void;
}

export default function HistoryTimelineItem({
  log,
  onDownload,
  onDelete,
}: HistoryTimelineItemProps) {
  const getExportTypeLabel = (exportType: string) => {
    switch (exportType) {
      case "new":
        return "Nouveaux uniquement";
      case "selective":
        return "Période sélectionnée";
      case "complete":
        return "Toutes les données";
      default:
        return exportType;
    }
  };

  const getExportTypeBadgeVariant = (exportType: string) => {
    switch (exportType) {
      case "new":
        return "default" as const;
      case "selective":
        return "secondary" as const;
      case "complete":
        return "outline" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <div className="flex gap-4 group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-primary/10 transition-all group-hover:scale-110">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div className="w-0.5 flex-1 bg-border mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <div className="border rounded-lg p-4 bg-card transition-all duration-300 hover:shadow-md">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg">{log.fileName}</h3>
                <Badge variant={getExportTypeBadgeVariant(log.exportType)}>
                  {getExportTypeLabel(log.exportType)}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Période:</span>
                  <span>
                    {log.startDate.toLocaleDateString("fr-FR")} -{" "}
                    {log.endDate.toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Créé le:</span>
                  <span>{log.createdAt.toLocaleString("fr-FR")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {log.totalRecords} enregistrement(s)
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(log)}
                className="transition-all hover:bg-primary hover:text-primary-foreground"
              >
                <Download className="h-4 w-4 mr-1" />
                Télécharger
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(log.id!)}
                className="transition-all hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
