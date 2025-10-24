import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  Users,
  Package,
  Settings,
} from "lucide-react";
import ExportWizard from "./ExportWizard";
import HistoryTimeline from "./HistoryTimeline";
import ImportActionCard from "./ImportActionCard";
import { useExportData } from "@/hooks/useExportData";
import { db } from "@/lib/database";
import SageTemplateManager from "@/components/exports/SageTemplateManager";
import SageClientImportDialog from "@/components/import/SageClientImportDialog";
import SageArticleImportDialog from "@/components/import/SageArticleImportDialog";

export default function ExportsSpace() {
  const [clientCount, setClientCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [templateCount, setTemplateCount] = useState(0);
  const [showClientImport, setShowClientImport] = useState(false);
  const [showArticleImport, setShowArticleImport] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  const { exportLogs, redownloadExport, deleteExportLog, loadExportLogs } = useExportData();

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    const clients = await db.clients.count();
    const products = await db.products.count();
    const templates = await db.sageTemplates.count();
    setClientCount(clients);
    setProductCount(products);
    setTemplateCount(templates);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Imports/Exports Sage</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos échanges de données avec Sage 50 de manière simple et efficace
          </p>
        </div>
        <Button onClick={loadExportLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="export" className="text-base">
            📤 Exporter
          </TabsTrigger>
          <TabsTrigger value="import" className="text-base">
            📥 Importer
          </TabsTrigger>
          <TabsTrigger value="history" className="text-base">
            📊 Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-6">
          <ExportWizard onExportComplete={() => loadExportLogs()} />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ImportActionCard
              icon={Users}
              title="Import Clients"
              description="Importez vos clients depuis Sage 50"
              count={clientCount}
              countLabel={`${clientCount} client(s) actuels`}
              buttonText="Importer des clients"
              onAction={() => setShowClientImport(true)}
            />
            <ImportActionCard
              icon={Package}
              title="Import Articles"
              description="Importez vos articles depuis Sage 50"
              count={productCount}
              countLabel={`${productCount} produit(s) actuels`}
              buttonText="Importer des articles"
              onAction={() => setShowArticleImport(true)}
            />
            <ImportActionCard
              icon={Settings}
              title="Templates personnalisés"
              description="Créer ou gérer vos templates d'export"
              count={templateCount}
              countLabel={`${templateCount} template(s) créés`}
              buttonText="Gérer les templates"
              onAction={() => setShowTemplateManager(true)}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <HistoryTimeline
            logs={exportLogs}
            onDownload={redownloadExport}
            onDelete={deleteExportLog}
          />
        </TabsContent>
      </Tabs>

      {showClientImport && (
        <SageClientImportDialog />
      )}
      {showArticleImport && (
        <SageArticleImportDialog />
      )}
      {showTemplateManager && (
        <SageTemplateManager />
      )}
    </div>
  );
}
