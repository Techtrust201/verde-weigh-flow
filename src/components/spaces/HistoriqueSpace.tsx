import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, Calendar, Eye, Trash2 } from "lucide-react";
import { db, Pesee, Product, Transporteur, Client } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { PeseeDetailDialog } from "@/components/pesee/PeseeDetailDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrackDechetStatsCards } from "@/components/trackdechet/TrackDechetStatsCards";
import { TrackDechetTimelineItem } from "@/components/trackdechet/TrackDechetTimelineItem";
import { TrackDechetFilters } from "@/components/trackdechet/TrackDechetFilters";
import { TrackDechetEmptyState } from "@/components/trackdechet/TrackDechetEmptyState";
import { useTrackDechetHistory } from "@/hooks/useTrackDechetHistory";
import { useTrackDechetStats } from "@/hooks/useTrackDechetStats";

interface HistoriqueSpaceProps {
  onEditPesee?: (peseeId: number) => void;
}

export default function HistoriqueSpace({ onEditPesee }: HistoriqueSpaceProps) {
  const [pesees, setPesees] = useState<Pesee[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transporteurs, setTransporteurs] = useState<Transporteur[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [selectedPesee, setSelectedPesee] = useState<Pesee | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [peseeToDelete, setPeseeToDelete] = useState<Pesee | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Set default to last month
    const now = new Date();
    const lastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    setDateDebut(lastMonth.toISOString().split("T")[0]);
    setDateFin(now.toISOString().split("T")[0]);

    loadData();
  }, []);

  useEffect(() => {
    loadPesees();
    setCurrentPage(1); // Réinitialiser la page quand les dates changent
  }, [dateDebut, dateFin]);

  useEffect(() => {
    setCurrentPage(1); // Réinitialiser la page quand la recherche change
  }, [searchQuery]);

  // Filtrer les pesées selon la recherche
  const getFilteredPesees = () => {
    let filtered = [...pesees];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.numeroBon?.toLowerCase().includes(query) ||
          p.numeroFacture?.toLowerCase().includes(query) ||
          p.nomEntreprise?.toLowerCase().includes(query) ||
          p.plaque?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const loadData = async () => {
    try {
      const [productsData, transporteursData, clientsData] = await Promise.all([
        db.products.toArray(),
        db.transporteurs.toArray(),
        db.clients.toArray(),
      ]);
      setProducts(productsData);
      setTransporteurs(transporteursData);
      setClients(clientsData);
      loadPesees();
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const loadPesees = async () => {
    try {
      let results: Pesee[];

      if (dateDebut && dateFin) {
        const startDate = new Date(dateDebut);
        const endDate = new Date(dateFin);
        endDate.setHours(23, 59, 59, 999);

        results = await db.pesees
          .filter(
            (pesee) =>
              pesee.dateHeure >= startDate && pesee.dateHeure <= endDate
          )
          .toArray();
      } else {
        results = await db.pesees.toArray();
      }

      // Trier par date décroissante (plus récent en premier)
      results.sort(
        (a, b) =>
          new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime()
      );

      setPesees(results);
    } catch (error) {
      console.error("Error loading pesees:", error);
    }
  };

  const handleViewDetails = (pesee: Pesee) => {
    setSelectedPesee(pesee);
    setIsDetailDialogOpen(true);
  };

  const handleDeletePesee = (pesee: Pesee) => {
    // Vérifier si la pesée a déjà été exportée
    if (pesee.exportedAt && pesee.exportedAt.length > 0) {
      toast({
        title: "Suppression impossible",
        description: `La pesée ${pesee.numeroBon} a déjà été exportée en CSV et ne peut plus être supprimée.`,
        variant: "destructive",
      });
      return;
    }

    setPeseeToDelete(pesee);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeletePesee = async () => {
    if (!peseeToDelete) return;

    try {
      // Supprimer la pesée de la base de données
      await db.pesees.delete(peseeToDelete.id!);

      // Recharger la liste des pesées
      await loadPesees();

      // Fermer le dialog
      setIsDeleteDialogOpen(false);
      setPeseeToDelete(null);

      toast({
        title: "Pesée supprimée",
        description: `La pesée ${peseeToDelete.numeroBon} a été supprimée avec succès.`,
      });
    } catch (error) {
      console.error("Error deleting pesee:", error);
      toast({
        title: "Erreur de suppression",
        description: "Impossible de supprimer la pesée.",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = async () => {
    try {
      const headers = [
        "Date",
        "Heure",
        "Type",
        "Numéro Bon",
        "Numéro Facture",
        "Plaque",
        "Produit",
        "Code Produit",
        "Net (T)",
        "Entreprise",
        "SIRET",
        "Adresse",
        "Chantier",
        "Prix HT",
        "Prix TTC",
      ];

      const csvContent = [
        headers.join(","),
        ...filteredPesees.map((pesee) => {
          const product = products.find((p) => p.id === pesee.produitId);
          const type = pesee.typeDocument || "bon_livraison";
          const typeLabel =
            type === "bon_livraison"
              ? "Bon de livraison"
              : type === "facture"
              ? "Facture"
              : "Bon + Facture";

          return [
            new Date(pesee.dateHeure).toLocaleDateString(),
            new Date(pesee.dateHeure).toLocaleTimeString(),
            typeLabel,
            pesee.numeroBon || "",
            pesee.numeroFacture || "",
            pesee.plaque,
            product?.nom || "",
            product?.codeProduct || "",
            pesee.net.toString(),
            pesee.nomEntreprise,
            pesee.clientId
              ? clients.find((c) => c.id === pesee.clientId)?.siret || ""
              : "",
            pesee.clientId
              ? clients.find((c) => c.id === pesee.clientId)?.adresse || ""
              : "",
            pesee.chantier || "",
            pesee.prixHT?.toString() || "",
            pesee.prixTTC?.toString() || "",
          ].join(",");
        }),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `export_pesees_${dateDebut}_${dateFin}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export réussi",
        description: "Les données ont été exportées en CSV.",
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données.",
        variant: "destructive",
      });
    }
  };

  const filteredPesees = getFilteredPesees();
  const totalPages = Math.ceil(filteredPesees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPesees = filteredPesees.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Historique</h1>
      </div>

      <Tabs defaultValue="pesees" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-2xl mx-auto h-12">
          <TabsTrigger value="pesees" className="text-base font-semibold">
            Pesées
          </TabsTrigger>
          <TabsTrigger value="trackdechet" className="text-base font-semibold">
            Track Déchet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pesees" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Filters */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
                Filtres
          </CardTitle>
        </CardHeader>
            <CardContent className="space-y-4">
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
              <div>
                <Label htmlFor="search">
                  Rechercher (numéro, client, plaque)
                </Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="BL50000, FA50000, client, plaque..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="text-sm text-gray-600">
                {filteredPesees.length} pesée(s) trouvée(s)
                {searchQuery && filteredPesees.length !== pesees.length && (
                  <span className="ml-2">(sur {pesees.length} au total)</span>
                )}
          </div>
        </CardContent>
      </Card>

      {/* Pesees List */}
      <div className="space-y-4">
        {currentPesees.map((pesee) => (
          <Card key={pesee.id}>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div>
                      <div className="font-semibold">
                        {pesee.numeroBon && pesee.numeroFacture
                          ? `${pesee.numeroBon} / ${pesee.numeroFacture}`
                          : pesee.numeroBon || pesee.numeroFacture || "N/A"}
                      </div>
                  <div className="text-sm text-gray-600">
                    {new Date(pesee.dateHeure).toLocaleDateString()} à{" "}
                    {new Date(pesee.dateHeure).toLocaleTimeString()}
                  </div>
                </div>
                <div>
                  <div className="font-medium">{pesee.nomEntreprise}</div>
                  <div className="text-sm text-gray-600">
                    Plaque: {pesee.plaque}
                  </div>
                  <div className="text-sm text-gray-600">
                    Chantier: {pesee.chantier}
                  </div>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">
                    {pesee.net} T
                  </Badge>
                  {pesee.exportedAt && pesee.exportedAt.length > 0 && (
                    <Badge variant="secondary" className="mb-2 text-xs">
                      Exporté
                    </Badge>
                  )}
                  <div className="text-sm text-gray-600">
                    {pesee.moyenPaiement}
                  </div>
                </div>
                <div>
                  {pesee.prixHT && (
                    <div className="font-medium text-green-600">
                      {pesee.prixHT.toFixed(2)}€ HT
                    </div>
                  )}
                  {pesee.prixTTC && (
                    <div className="font-medium text-green-600">
                      {pesee.prixTTC.toFixed(2)}€ TTC
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    onClick={() => handleViewDetails(pesee)}
                    variant="outline"
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Détails
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => handleDeletePesee(pesee)}
                          variant="outline"
                          size="sm"
                          disabled={
                            pesee.exportedAt && pesee.exportedAt.length > 0
                          }
                          className={
                            pesee.exportedAt && pesee.exportedAt.length > 0
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-red-600 hover:text-red-700 hover:bg-red-50"
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {pesee.exportedAt && pesee.exportedAt.length > 0
                            ? "Cette pesée a été exportée en CSV et ne peut plus être supprimée pour préserver l'intégrité des données"
                            : "Supprimer la pesée"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>
          <span className="flex items-center px-4">
            Page {currentPage} sur {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Dialog des détails */}
      <PeseeDetailDialog
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        pesee={selectedPesee}
        products={products}
        transporteurs={transporteurs}
            onEdit={(pesee) => {
              if (!pesee.id) {
                toast({
                  title: "Modification impossible",
                  description:
                    "Impossible de modifier cette pesée car son identifiant est introuvable.",
                  variant: "destructive",
                });
                return;
              }
              setIsDetailDialogOpen(false);
              onEditPesee?.(pesee.id);
            }}
      />

      {/* Dialog de confirmation de suppression */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Supprimer la pesée"
        description={`Êtes-vous sûr de vouloir supprimer définitivement la pesée ${peseeToDelete?.numeroBon} ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={confirmDeletePesee}
        variant="destructive"
      />
        </TabsContent>

        <TabsContent value="trackdechet" className="space-y-6">
          <TrackDechetTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TrackDechetTab() {
  const { history, loading, refresh } = useTrackDechetHistory();
  const { stats } = useTrackDechetStats();
  const [filters, setFilters] = useState({
    status: "all",
    client: "",
    search: "",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredHistory = history.filter((item) => {
    if (filters.status !== "all" && item.bsdStatus !== filters.status)
      return false;
    if (
      filters.client &&
      item.clientName?.toLowerCase().includes(filters.client.toLowerCase()) ===
        false
    )
      return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        item.numeroBon.toLowerCase().includes(searchLower) ||
        item.plaque?.toLowerCase().includes(searchLower) ||
        item.bsdReadableId?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="space-y-6">
      <TrackDechetStatsCards 
        stats={stats} 
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <TrackDechetFilters 
        filters={filters} 
        onFiltersChange={setFilters}
        resultCount={filteredHistory.length}
      />
      
      {loading ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
              <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Chargement des BSD...
            </p>
          </CardContent>
        </Card>
      ) : filteredHistory.length === 0 ? (
        <TrackDechetEmptyState />
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item, index) => (
            <div key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
              <TrackDechetTimelineItem item={item} onRefresh={refresh} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
