import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { History, Search, Filter } from "lucide-react";
import { ExportLog } from "@/hooks/useExportData";
import HistoryTimelineItem from "./HistoryTimelineItem";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HistoryTimelineProps {
  logs: ExportLog[];
  onDownload: (log: ExportLog) => void;
  onDelete: (id: number) => void;
}

export default function HistoryTimeline({
  logs,
  onDownload,
  onDelete,
}: HistoryTimelineProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.exportType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter =
      filterType === "all" || log.exportType === filterType;

    return matchesSearch && matchesFilter;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <History className="h-5 w-5 mr-2" />
            Historique des exports
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {logs.length} export(s)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans l'historique..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="new">Nouveaux uniquement</SelectItem>
                <SelectItem value="selective">Période sélectionnée</SelectItem>
                <SelectItem value="complete">Toutes les données</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timeline */}
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun export trouvé</p>
              <p className="text-sm mt-2">
                {searchTerm || filterType !== "all"
                  ? "Essayez de modifier vos filtres"
                  : "Les exports que vous créerez apparaîtront ici"}
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredLogs.map((log) => (
                <HistoryTimelineItem
                  key={log.id}
                  log={log}
                  onDownload={onDownload}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
