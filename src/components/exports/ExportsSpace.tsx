import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Download, 
  FileText, 
  Calendar, 
  Database, 
  History,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  Check,
  X
} from 'lucide-react';
import { useExportData, ExportStats, ExportFormat } from '@/hooks/useExportData';
import { db, Pesee, Product } from '@/lib/database';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ExportsSpace() {
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [exportStats, setExportStats] = useState<ExportStats | null>(null);
  const [selectedExportType, setSelectedExportType] = useState<'new' | 'selective' | 'complete'>('new');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [previewPesees, setPreviewPesees] = useState<Pesee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPeseeIds, setSelectedPeseeIds] = useState<Set<number>>(new Set());
  const [showPreview, setShowPreview] = useState(false);

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
    
    // Load products
    loadProducts();
  }, []);

  useEffect(() => {
    if (dateDebut && dateFin) {
      updateStats();
      loadPreviewData();
    }
  }, [dateDebut, dateFin, selectedExportType, selectedFormat]);

  const loadProducts = async () => {
    try {
      const productsData = await db.products.toArray();
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadPreviewData = async () => {
    if (!dateDebut || !dateFin) return;
    
    try {
      const startDate = new Date(dateDebut);
      const endDate = new Date(dateFin);
      endDate.setHours(23, 59, 59, 999);
      
      let query = db.pesees.filter(pesee => 
        pesee.dateHeure >= startDate && pesee.dateHeure <= endDate
      );

      const allPesees = await query.toArray();
      
      let filteredPesees: Pesee[];
      switch (selectedExportType) {
        case 'new':
          filteredPesees = allPesees.filter(pesee => 
            !pesee.exportedAt || pesee.exportedAt.length === 0
          );
          break;
        case 'complete':
          filteredPesees = allPesees;
          break;
        case 'selective':
        default:
          filteredPesees = allPesees;
          break;
      }
      
      setPreviewPesees(filteredPesees);
      
      // Auto-select all pesees by default
      const allIds = new Set(filteredPesees.map(p => p.id!));
      setSelectedPeseeIds(allIds);
      
      setShowPreview(filteredPesees.length > 0);
    } catch (error) {
      console.error('Error loading preview data:', error);
    }
  };

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
    if (!dateDebut || !dateFin || (selectedFormat !== 'sage-articles' && selectedPeseeIds.size === 0)) {
      return;
    }

    // Filter pesees to only selected ones
    const selectedPesees = previewPesees.filter(p => selectedPeseeIds.has(p.id!));
    
    const startDate = new Date(dateDebut);
    const endDate = new Date(dateFin);
    endDate.setHours(23, 59, 59, 999);

    // Call export with selected pesees and format
    await exportToCSV(startDate, endDate, selectedExportType, selectedPesees, selectedFormat);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(previewPesees.map(p => p.id!));
      setSelectedPeseeIds(allIds);
    } else {
      setSelectedPeseeIds(new Set());
    }
  };

  const handleSelectPesee = (peseeId: number, checked: boolean) => {
    const newSelected = new Set(selectedPeseeIds);
    if (checked) {
      newSelected.add(peseeId);
    } else {
      newSelected.delete(peseeId);
    }
    setSelectedPeseeIds(newSelected);
  };

  const getProductName = (produitId: number) => {
    const product = products.find(p => p.id === produitId);
    return product?.nom || 'Produit inconnu';
  };

  const getExportTypeLabel = (type: string) => {
    if (type.includes('sage-articles')) return 'Articles Sage';
    if (type.includes('sage-ventes')) return 'Ventes Sage';
    if (type.includes('csv')) return 'CSV Standard';
    
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

  const getFormatLabel = (format: ExportFormat) => {
    switch (format) {
      case 'csv':
        return 'CSV Standard';
      case 'sage-articles':
        return 'Sage 50 - Articles';
      case 'sage-ventes':
        return 'Sage 50 - Ventes';
      default:
        return format;
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
        <h1 className="text-3xl font-bold">Exports pour Sage 50</h1>
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

              {/* Format d'export */}
              <div>
                <Label htmlFor="format-select">Format d'export</Label>
                <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as ExportFormat)}>
                  <SelectTrigger id="format-select" className="mt-2">
                    <SelectValue placeholder="Sélectionner un format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV Standard - Compatible Excel</SelectItem>
                    <SelectItem value="sage-articles">Sage 50 - Import Articles (.txt)</SelectItem>
                    <SelectItem value="sage-ventes">Sage 50 - Import Ventes (.txt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type de données - adapté selon le format */}
              {selectedFormat !== 'sage-articles' && (
                <div>
                  <Label>Type de données</Label>
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
              )}

              {/* Statistiques */}
              {exportStats && selectedFormat !== 'sage-articles' && (
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

              {/* Descriptions des formats et types d'export */}
              <div className="space-y-2 text-sm text-muted-foreground">
                {selectedFormat === 'csv' && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <strong>CSV Standard :</strong> Format compatible Excel avec toutes les données de pesée.
                      Utilise l'encodage UTF-8 et des points-virgules comme séparateurs.
                    </AlertDescription>
                  </Alert>
                )}
                {selectedFormat === 'sage-articles' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Sage 50 Articles :</strong> Exporte la liste des produits pour import dans Sage 50.
                      Format .txt avec tabulations, encodage Windows-1252. Inclut codes articles, prix, comptes comptables.
                    </AlertDescription>
                  </Alert>
                )}
                {selectedFormat === 'sage-ventes' && (
                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Sage 50 Ventes :</strong> Exporte les pesées comme lignes de facture pour Sage 50.
                      Format .txt avec tabulations, encodage Windows-1252. Prêt pour import direct dans Sage.
                    </AlertDescription>
                  </Alert>
                )}
                
                {selectedFormat !== 'sage-articles' && selectedExportType === 'new' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Nouveaux uniquement :</strong> Exporte seulement les pesées qui n'ont jamais été exportées. 
                      Recommandé pour éviter les doublons dans Sage 50.
                    </AlertDescription>
                  </Alert>
                )}
                {selectedFormat !== 'sage-articles' && selectedExportType === 'selective' && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Période sélectionnée :</strong> Exporte toutes les pesées de la période, 
                      même celles déjà exportées. Marque les nouvelles comme exportées.
                    </AlertDescription>
                  </Alert>
                )}
                {selectedFormat !== 'sage-articles' && selectedExportType === 'complete' && (
                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Toutes les données :</strong> Exporte toutes les pesées de la période sans 
                      modifier leur statut d'export. Utile pour les sauvegardes.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Interface unifiée d'aperçu et export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  {selectedFormat === 'sage-articles' ? 'Export Articles Sage 50' : 'Aperçu des données à exporter'}
                </div>
                {selectedFormat !== 'sage-articles' && showPreview && (
                  <Badge variant="outline">
                    {selectedPeseeIds.size} / {previewPesees.length} sélectionnées
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedFormat === 'sage-articles' ? (
                // Interface spéciale pour Sage Articles
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Cet export générera un fichier .txt contenant tous vos produits au format Sage 50.
                      Le fichier inclura les codes articles, désignations, prix et comptes comptables.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="font-bold text-lg text-blue-600">{products.length}</div>
                      <div className="text-sm text-muted-foreground">Articles à exporter</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-green-600">100%</div>
                      <div className="text-sm text-muted-foreground">Compatibilité Sage</div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleExport} 
                      disabled={isLoading}
                      className="min-w-32"
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {isLoading ? 'Export...' : 'Exporter Articles Sage'}
                    </Button>
                  </div>
                </div>
              ) : showPreview ? (
                // Interface pour données de pesée
                <div className="space-y-4">
                  {/* Contrôles de sélection */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedPeseeIds.size === previewPesees.length && previewPesees.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="select-all" className="text-sm">
                        Tout sélectionner
                      </Label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPeseeIds(new Set())}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Tout désélectionner
                    </Button>
                  </div>

                  {/* Tableau des pesées */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <span className="sr-only">Sélection</span>
                          </TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>N° Bon</TableHead>
                          <TableHead>Plaque</TableHead>
                          <TableHead>Entreprise</TableHead>
                          <TableHead>Produit</TableHead>
                          <TableHead>Net (T)</TableHead>
                          <TableHead>Prix TTC</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewPesees.map((pesee) => (
                          <TableRow 
                            key={pesee.id}
                            className={selectedPeseeIds.has(pesee.id!) ? 'bg-blue-50' : ''}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedPeseeIds.has(pesee.id!)}
                                onCheckedChange={(checked) => 
                                  handleSelectPesee(pesee.id!, checked as boolean)
                                }
                              />
                            </TableCell>
                            <TableCell className="text-sm">
                              {pesee.dateHeure.toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {pesee.numeroBon}
                            </TableCell>
                            <TableCell className="text-sm">
                              {pesee.plaque}
                            </TableCell>
                            <TableCell className="text-sm max-w-32 truncate">
                              {pesee.nomEntreprise}
                            </TableCell>
                            <TableCell className="text-sm">
                              {getProductName(pesee.produitId)}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {pesee.net}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-green-600">
                              {pesee.prixTTC.toFixed(2)}€
                            </TableCell>
                            <TableCell>
                              {pesee.exportedAt && pesee.exportedAt.length > 0 ? (
                                <Badge variant="secondary" className="text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Exporté
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Nouveau
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Statistiques de sélection */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="font-bold text-lg text-blue-600">{selectedPeseeIds.size}</div>
                      <div className="text-sm text-muted-foreground">Sélectionnées</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-green-600">
                        {Array.from(selectedPeseeIds).filter(id => {
                          const pesee = previewPesees.find(p => p.id === id);
                          return !pesee?.exportedAt || pesee.exportedAt.length === 0;
                        }).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Nouvelles</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-orange-600">
                        {Array.from(selectedPeseeIds).filter(id => {
                          const pesee = previewPesees.find(p => p.id === id);
                          return pesee?.exportedAt && pesee.exportedAt.length > 0;
                        }).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Déjà exportées</div>
                    </div>
                  </div>

                  {/* Bouton d'export pour données de pesée */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleExport} 
                      disabled={isLoading || !dateDebut || !dateFin || selectedPeseeIds.size === 0}
                      className="min-w-32"
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {isLoading ? 'Export...' : `Exporter ${selectedPeseeIds.size} pesée(s)`}
                    </Button>
                  </div>
                </div>
              ) : (
                // Message quand pas de données à afficher
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                  <p>Aucune donnée à afficher pour la période sélectionnée.</p>
                  <p className="text-sm mt-2">Vérifiez vos dates ou changez le type de données.</p>
                </div>
              )}
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
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <p>Aucun export trouvé</p>
                  <p className="text-sm mt-2">Vos exports apparaîtront ici une fois créés.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {exportLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-medium">{log.fileName}</div>
                            <div className="text-sm text-muted-foreground">
                              {getExportTypeLabel(log.exportType)} • {log.totalRecords} enregistrement(s)
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.startDate.toLocaleDateString()} - {log.endDate.toLocaleDateString()} • 
                              Créé le {log.createdAt.toLocaleDateString()} à {log.createdAt.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getExportTypeBadgeVariant(log.exportType)}>
                          {getExportTypeLabel(log.exportType)}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => redownloadExport(log)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteExportLog(log.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
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