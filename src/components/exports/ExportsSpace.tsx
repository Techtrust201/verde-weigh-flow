import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  FileText, 
  Calendar, 
  Database, 
  History,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useExportData, ExportStats } from '@/hooks/useExportData';

export default function ExportsSpace() {
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [exportStats, setExportStats] = useState<ExportStats | null>(null);
  const [selectedExportType, setSelectedExportType] = useState<'new' | 'selective' | 'complete'>('new');

  const {
    exportLogs,
    isLoading,
    getExportStats,
    exportToCSV,
    redownloadExport,
    deleteExportLog,
    loadExportLogs
  } = useExportData();

  useEffect(() => {
    // Set default to last month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    setDateDebut(lastMonth.toISOString().split('T')[0]);
    setDateFin(now.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (dateDebut && dateFin) {
      updateStats();
    }
  }, [dateDebut, dateFin]);

  const updateStats = async () => {
    if (dateDebut && dateFin) {
      const startDate = new Date(dateDebut);
      const endDate = new Date(dateFin);
      endDate.setHours(23, 59, 59, 999);
      
      const stats = await getExportStats(startDate, endDate);
      setExportStats(stats);
    }
  };

  const handleExport = async () => {
    if (!dateDebut || !dateFin) {
      return;
    }

    const startDate = new Date(dateDebut);
    const endDate = new Date(dateFin);
    endDate.setHours(23, 59, 59, 999);

    await exportToCSV(startDate, endDate, selectedExportType);
  };

  const getExportTypeLabel = (type: string) => {
    switch (type) {
      case 'new':
        return 'Nouveaux uniquement';
      case 'selective':
        return 'Sélectif';
      case 'complete':
        return 'Complet';
      default:
        return type;
    }
  };

  const getExportTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'new':
        return 'default';
      case 'selective':
        return 'secondary';
      case 'complete':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Exports CSV pour Sage 50</h1>
        <Button onClick={() => loadExportLogs()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Nouvel Export</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-6">
          {/* Configuration d'export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Configuration d'export
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Période */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateDebut">Date de début</Label>
                  <Input
                    id="dateDebut"
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dateFin">Date de fin</Label>
                  <Input
                    id="dateFin"
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                  />
                </div>
              </div>

              {/* Type d'export */}
              <div>
                <Label>Type d'export</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    variant={selectedExportType === 'new' ? 'default' : 'outline'}
                    onClick={() => setSelectedExportType('new')}
                    className="text-sm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Nouveaux uniquement
                  </Button>
                  <Button
                    variant={selectedExportType === 'selective' ? 'default' : 'outline'}
                    onClick={() => setSelectedExportType('selective')}
                    className="text-sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Période sélectionnée
                  </Button>
                  <Button
                    variant={selectedExportType === 'complete' ? 'default' : 'outline'}
                    onClick={() => setSelectedExportType('complete')}
                    className="text-sm"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Toutes les données
                  </Button>
                </div>
              </div>

              {/* Statistiques */}
              {exportStats && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div className="text-center">
                        <div className="font-bold text-lg text-blue-600">{exportStats.totalPesees}</div>
                        <div className="text-sm text-muted-foreground">Total pesées</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-green-600">{exportStats.newPesees}</div>
                        <div className="text-sm text-muted-foreground">Nouvelles</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-orange-600">{exportStats.alreadyExported}</div>
                        <div className="text-sm text-muted-foreground">Déjà exportées</div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Descriptions des types d'export */}
              <div className="space-y-2 text-sm text-muted-foreground">
                {selectedExportType === 'new' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Nouveaux uniquement :</strong> Exporte seulement les pesées qui n'ont jamais été exportées. 
                      Recommandé pour éviter les doublons dans Sage 50.
                    </AlertDescription>
                  </Alert>
                )}
                {selectedExportType === 'selective' && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Période sélectionnée :</strong> Exporte toutes les pesées de la période, 
                      même celles déjà exportées. Marque les nouvelles comme exportées.
                    </AlertDescription>
                  </Alert>
                )}
                {selectedExportType === 'complete' && (
                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Toutes les données :</strong> Exporte toutes les pesées de la période sans 
                      modifier leur statut d'export. Utile pour les sauvegardes.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Bouton d'export */}
              <div className="flex justify-end">
                <Button 
                  onClick={handleExport} 
                  disabled={isLoading || !dateDebut || !dateFin}
                  className="min-w-32"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? 'Export...' : 'Exporter vers Sage 50'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2" />
                Historique des exports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {exportLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun export effectué</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {exportLogs.map((log) => (
                    <Card key={log.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{log.fileName}</h3>
                              <Badge variant={getExportTypeBadgeVariant(log.exportType)}>
                                {getExportTypeLabel(log.exportType)}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {log.startDate.toLocaleDateString()} - {log.endDate.toLocaleDateString()}
                                </span>
                                <span className="flex items-center">
                                  <Database className="h-4 w-4 mr-1" />
                                  {log.totalRecords} pesée(s)
                                </span>
                              </div>
                              <div>
                                Créé le {log.createdAt.toLocaleDateString()} à {log.createdAt.toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => redownloadExport(log)}
                              variant="outline"
                              size="sm"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Re-télécharger
                            </Button>
                            <Button
                              onClick={() => deleteExportLog(log.id!)}
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}