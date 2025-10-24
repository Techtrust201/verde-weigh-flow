import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  LayoutGrid,
  LayoutList,
  CheckSquare,
  Square,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { db, Transporteur } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { useTransporteurData } from '@/hooks/useTransporteurData';
import { Pagination } from "@/components/ui/pagination";
import TransporteurForm from '@/components/forms/TransporteurForm';
import TransporteurStatsCards from './TransporteurStatsCards';
import TransporteurCardGrid from './TransporteurCardGrid';
import EmptyTransporteurState from './EmptyTransporteurState';
import TransporteurQuickFilters from './TransporteurQuickFilters';

export default function TransporteursSpace() {
  const { transporteurs, loadTransporteurs } = useTransporteurData();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTransporteur, setEditingTransporteur] = useState<Transporteur | null>(null);
  const [selectedTransporteurIds, setSelectedTransporteurIds] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => {
    return (localStorage.getItem("transporteursViewMode") as "cards" | "table") || "cards";
  });
  const [quickFilter, setQuickFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState<Partial<Transporteur>>({
    prenom: '',
    nom: '',
    siret: '',
    adresse: '',
    codePostal: '',
    ville: '',
    email: '',
    telephone: '',
    plaque: ''
  });

  const { toast } = useToast();

  // Gestion du changement de vue
  const handleViewModeChange = (mode: "cards" | "table") => {
    setViewMode(mode);
    localStorage.setItem("transporteursViewMode", mode);
  };

  // Gestion des filtres rapides
  const handleQuickFilterChange = (filter: string) => {
    setQuickFilter(filter);
  };

  // Gestion du clic sur les stats
  const handleStatClick = (filterType: string) => {
    setQuickFilter(filterType);
  };

  // Appliquer les filtres rapides et la recherche
  const getFilteredTransporteurs = () => {
    let filtered = [...transporteurs];

    // Filtre rapide
    if (quickFilter === "withSiret") {
      filtered = filtered.filter((t) => t.siret && t.siret.trim() !== "");
    } else if (quickFilter === "noSiret") {
      filtered = filtered.filter((t) => !t.siret || t.siret.trim() === "");
    } else if (quickFilter === "withEmail") {
      filtered = filtered.filter((t) => t.email && t.email.trim() !== "");
    } else if (quickFilter === "withPhone") {
      filtered = filtered.filter((t) => t.telephone && t.telephone.trim() !== "");
    }

    // Recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.prenom?.toLowerCase().includes(query) ||
          t.nom?.toLowerCase().includes(query) ||
          t.siret?.toLowerCase().includes(query) ||
          t.telephone?.toLowerCase().includes(query) ||
          t.email?.toLowerCase().includes(query) ||
          t.ville?.toLowerCase().includes(query) ||
          t.plaque?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const displayedTransporteurs = getFilteredTransporteurs();

  // Pagination manuelle après filtrage
  const totalPages = Math.ceil(displayedTransporteurs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTransporteurs = displayedTransporteurs.slice(startIndex, endIndex);

  // Reset à la page 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [quickFilter, searchQuery, transporteurs]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.prenom || !formData.nom) {
      toast({
        title: "Erreur",
        description: "Le prénom et le nom sont obligatoires.",
        variant: "destructive"
      });
      return;
    }

    // SIRET obligatoire (marqué * dans le formulaire)
    if (!formData.siret) {
      toast({
        title: "Erreur",
        description: "Le SIRET est obligatoire.",
        variant: "destructive"
      });
      return;
    }

    // Adresse obligatoire pour Track Déchet
    if (!formData.adresse) {
      toast({
        title: "Erreur",
        description: "L'adresse est obligatoire.",
        variant: "destructive"
      });
      return;
    }

    // Ville et code postal obligatoires
    if (!formData.ville || !formData.codePostal) {
      toast({
        title: "Erreur",
        description: "La ville et le code postal sont obligatoires.",
        variant: "destructive"
      });
      return;
    }

    try {
      const transporteurData = {
        ...formData,
        telephone: formData.telephone || '',
        plaque: formData.plaque || '',
        updatedAt: new Date()
      };

      if (editingTransporteur && editingTransporteur.id) {
        await db.transporteurs.update(editingTransporteur.id, transporteurData);
        toast({
          title: "Transporteur modifié",
          description: "Le transporteur a été mis à jour avec succès."
        });
      } else {
        await db.transporteurs.add({
          ...transporteurData,
          createdAt: new Date()
        } as Transporteur);
        toast({
          title: "Transporteur ajouté",
          description: "Le nouveau transporteur a été créé avec succès."
        });
      }

      setIsAddDialogOpen(false);
      setEditingTransporteur(null);
      resetForm();
      loadTransporteurs();
    } catch (error) {
      console.error('Error saving transporteur:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le transporteur.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      prenom: '',
      nom: '',
      siret: '',
      adresse: '',
      codePostal: '',
      ville: '',
      email: '',
      telephone: '',
      plaque: ''
    });
    setEditingTransporteur(null);
  };

  const handleEdit = (transporteur: Transporteur) => {
    setEditingTransporteur(transporteur);
    setFormData(transporteur);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (transporteur: Transporteur) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce transporteur ?')) {
      try {
        await db.transporteurs.delete(transporteur.id!);
        toast({
          title: "Transporteur supprimé",
          description: "Le transporteur a été supprimé avec succès."
        });
        loadTransporteurs();
      } catch (error) {
        console.error('Error deleting transporteur:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le transporteur.",
          variant: "destructive"
        });
      }
    }
  };

  // Fonctions de gestion de sélection multiple
  const toggleTransporteurSelection = (transporteurId: number) => {
    const newSelection = new Set(selectedTransporteurIds);
    if (newSelection.has(transporteurId)) {
      newSelection.delete(transporteurId);
    } else {
      newSelection.add(transporteurId);
    }
    setSelectedTransporteurIds(newSelection);
  };

  const selectAllTransporteurs = () => {
    setSelectedTransporteurIds(new Set(paginatedTransporteurs.map((t) => t.id!)));
  };

  const deselectAllTransporteurs = () => {
    setSelectedTransporteurIds(new Set());
  };

  const deleteSelectedTransporteurs = async () => {
    if (selectedTransporteurIds.size === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins un transporteur à supprimer.",
        variant: "destructive",
      });
      return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir supprimer ${selectedTransporteurIds.size} transporteur(s) ? Cette action est irréversible.`;
    if (window.confirm(confirmMessage)) {
      try {
        const deletePromises = Array.from(selectedTransporteurIds).map((id) =>
          db.transporteurs.delete(id)
        );
        await Promise.all(deletePromises);

        toast({
          title: "Succès",
          description: `${selectedTransporteurIds.size} transporteur(s) supprimé(s) avec succès.`,
        });

        setSelectedTransporteurIds(new Set());
        loadTransporteurs();
      } catch (error) {
        console.error("Erreur lors de la suppression multiple:", error);
        toast({
          title: "Erreur",
          description: "Une erreur s'est produite lors de la suppression.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec titre et bouton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Gestion des Transporteurs
          </h2>
          <p className="text-muted-foreground">
            Gérez vos transporteurs et leurs informations
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Nouveau transporteur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTransporteur ? 'Modifier le transporteur' : 'Nouveau transporteur'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <TransporteurForm 
                formData={formData} 
                onFormDataChange={setFormData}
                isEditing={!!editingTransporteur}
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  {editingTransporteur ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      <TransporteurStatsCards transporteurs={transporteurs} onStatClick={handleStatClick} />

      {/* Barre de recherche et toggle vue */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher un transporteur par nom, SIRET, plaque..."
                className="pl-10 h-12 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="icon"
                onClick={() => handleViewModeChange("cards")}
                className="h-12 w-12"
              >
                <LayoutGrid className="h-5 w-5" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="icon"
                onClick={() => handleViewModeChange("table")}
                className="h-12 w-12"
              >
                <LayoutList className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtres rapides */}
      <TransporteurQuickFilters
        activeFilter={quickFilter}
        onFilterChange={handleQuickFilterChange}
        onClearFilters={() => {
          setQuickFilter("all");
          setSearchQuery("");
        }}
      />

      {/* Contenu des transporteurs */}
      {displayedTransporteurs.length === 0 && transporteurs.length === 0 ? (
        <EmptyTransporteurState onCreateTransporteur={() => {
          resetForm();
          setIsAddDialogOpen(true);
        }} />
      ) : (
        <>
          {viewMode === "cards" ? (
            <div>
              {displayedTransporteurs.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucun transporteur trouvé</h3>
                    <p className="text-muted-foreground mb-4">Aucun transporteur ne correspond à vos critères.</p>
                    <Button variant="outline" onClick={() => { setQuickFilter("all"); setSearchQuery(""); }}>
                      Réinitialiser les filtres
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <TransporteurCardGrid
                  transporteurs={paginatedTransporteurs}
                  selectedTransporteurIds={selectedTransporteurIds}
                  onSelect={toggleTransporteurSelection}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Transporteurs ({displayedTransporteurs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {displayedTransporteurs.length === 0 ? (
                  <div className="text-center py-12">
                    <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucun transporteur trouvé</h3>
                    <p className="text-muted-foreground mb-4">Aucun transporteur ne correspond à vos critères.</p>
                    <Button variant="outline" onClick={() => { setQuickFilter("all"); setSearchQuery(""); }}>
                      Réinitialiser les filtres
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={selectAllTransporteurs} disabled={paginatedTransporteurs.length === 0}>
                          <CheckSquare className="h-4 w-4 mr-2" />Tout sélectionner
                        </Button>
                        <Button variant="outline" size="sm" onClick={deselectAllTransporteurs} disabled={selectedTransporteurIds.size === 0}>
                          <Square className="h-4 w-4 mr-2" />Désélectionner
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox 
                                checked={paginatedTransporteurs.length > 0 && paginatedTransporteurs.every((t) => selectedTransporteurIds.has(t.id!))} 
                                onCheckedChange={(checked) => { 
                                  if (checked) selectAllTransporteurs(); 
                                  else deselectAllTransporteurs(); 
                                }} 
                              />
                            </TableHead>
                            <TableHead>Nom Complet</TableHead>
                            <TableHead>SIRET</TableHead>
                            <TableHead>Adresse</TableHead>
                            <TableHead>Téléphone</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Plaque</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedTransporteurs.map((transporteur) => (
                            <TableRow key={transporteur.id}>
                              <TableCell>
                                <Checkbox 
                                  checked={selectedTransporteurIds.has(transporteur.id!)} 
                                  onCheckedChange={() => toggleTransporteurSelection(transporteur.id!)} 
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {transporteur.prenom} {transporteur.nom}
                              </TableCell>
                              <TableCell className="text-sm">
                                {transporteur.siret ? (
                                  <span className="font-mono">{transporteur.siret}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm max-w-[200px] truncate" title={transporteur.adresse || ""}>
                                {transporteur.adresse ? (
                                  <span>{transporteur.adresse}{transporteur.ville ? `, ${transporteur.ville}` : ""}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {transporteur.telephone || <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell className="text-sm truncate max-w-[150px]" title={transporteur.email || ""}>
                                {transporteur.email || <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell>
                                {transporteur.plaque ? (
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {transporteur.plaque}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEdit(transporteur)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(transporteur)} 
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {displayedTransporteurs.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={displayedTransporteurs.length}
              pageSize={pageSize}
              onPageChange={goToPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
