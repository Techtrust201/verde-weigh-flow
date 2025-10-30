import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { db, Tax } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Percent } from "lucide-react";

export function TaxesManager() {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    taux: "",
    tauxTVA: "20", // TVA appliquée sur la taxe (par défaut 20)
  });
  const { toast } = useToast();

  const loadTaxes = useCallback(async () => {
    try {
      const allTaxes = await db.taxes.orderBy("nom").toArray();
      setTaxes(allTaxes);
    } catch (error) {
      console.error("Erreur lors du chargement des taxes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les taxes.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    loadTaxes();
  }, [loadTaxes]);

  const handleOpenDialog = (tax?: Tax) => {
    if (tax) {
      setEditingTax(tax);
      setFormData({
        nom: tax.nom,
        taux: tax.taux.toString(),
        tauxTVA: (tax.tauxTVA ?? 20).toString(),
      });
    } else {
      setEditingTax(null);
      setFormData({ nom: "", taux: "", tauxTVA: "20" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTax(null);
    setFormData({ nom: "", taux: "", tauxTVA: "20" });
  };

  const handleSave = async () => {
    if (!formData.nom.trim() || !formData.taux.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive",
      });
      return;
    }

    const taux = parseFloat(formData.taux);
    const tauxTVA = parseFloat(formData.tauxTVA || "20");
    if (isNaN(taux) || taux < 0 || taux > 100) {
      if (isNaN(tauxTVA) || tauxTVA < 0 || tauxTVA > 100) {
        toast({
          title: "Erreur",
          description: "La TVA doit être un nombre entre 0 et 100.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Erreur",
        description: "Le taux doit être un nombre entre 0 et 100.",
        variant: "destructive",
      });
      return;
    }

    try {
      const now = new Date();
      if (editingTax) {
        // Mise à jour
        await db.taxes.update(editingTax.id!, {
          nom: formData.nom.trim(),
          taux,
          tauxTVA,
          updatedAt: now,
        });
        toast({
          title: "Taxe mise à jour",
          description: `La taxe "${formData.nom}" a été mise à jour.`,
        });
      } else {
        // Création
        await db.taxes.add({
          nom: formData.nom.trim(),
          taux,
          tauxTVA,
          active: true,
          createdAt: now,
          updatedAt: now,
        });
        toast({
          title: "Taxe créée",
          description: `La taxe "${formData.nom}" a été créée.`,
        });
      }

      await loadTaxes();
      handleCloseDialog();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la taxe.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (tax: Tax) => {
    try {
      await db.taxes.update(tax.id!, {
        active: !tax.active,
        updatedAt: new Date(),
      });
      await loadTaxes();
      toast({
        title: tax.active ? "Taxe désactivée" : "Taxe activée",
        description: `La taxe "${tax.nom}" a été ${
          tax.active ? "désactivée" : "activée"
        }.`,
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier la taxe.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (tax: Tax) => {
    if (
      !window.confirm(
        `Êtes-vous sûr de vouloir supprimer la taxe "${tax.nom}" ?`
      )
    ) {
      return;
    }

    try {
      await db.taxes.delete(tax.id!);
      await loadTaxes();
      toast({
        title: "Taxe supprimée",
        description: `La taxe "${tax.nom}" a été supprimée.`,
      });
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la taxe.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Gestion des Taxes
            </CardTitle>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle taxe
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {taxes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Percent className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune taxe configurée.</p>
              <p className="text-sm">
                Cliquez sur "Nouvelle taxe" pour en créer une.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Taux</TableHead>
                  <TableHead>TVA taxe</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxes.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell className="font-medium">{tax.nom}</TableCell>
                    <TableCell>{tax.taux}%</TableCell>
                    <TableCell>{tax.tauxTVA ?? 20}%</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={tax.active}
                          onCheckedChange={() => handleToggleActive(tax)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {tax.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(tax)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(tax)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTax ? "Modifier la taxe" : "Nouvelle taxe"}
            </DialogTitle>
            <DialogDescription>
              Les taxes actives seront automatiquement appliquées aux factures
              générées.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom de la taxe *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) =>
                  setFormData({ ...formData, nom: e.target.value })
                }
                placeholder="Ex: TVA, Taxe environnementale..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taux">Taux (%) *</Label>
              <div className="relative">
                <Input
                  id="taux"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.taux}
                  onChange={(e) =>
                    setFormData({ ...formData, taux: e.target.value })
                  }
                  placeholder="Ex: 20"
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tauxTVA">TVA appliquée à cette taxe (%)</Label>
              <div className="relative">
                <Input
                  id="tauxTVA"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tauxTVA}
                  onChange={(e) =>
                    setFormData({ ...formData, tauxTVA: e.target.value })
                  }
                  placeholder="20"
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Cette taxe est assujettie à la TVA. Ajustez le taux si besoin
                (20% par défaut).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              {editingTax ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
