import { useState, useEffect } from "react";
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
import { db, PaymentMethod } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react";

export function PaymentMethodsManager() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(
    null
  );
  const [formData, setFormData] = useState({
    code: "",
    libelle: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const allMethods = await db.paymentMethods.orderBy("code").toArray();
      setPaymentMethods(allMethods);
    } catch (error) {
      console.error("Erreur lors du chargement des modes de paiement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les modes de paiement.",
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        code: method.code,
        libelle: method.libelle,
      });
    } else {
      setEditingMethod(null);
      setFormData({ code: "", libelle: "" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMethod(null);
    setFormData({ code: "", libelle: "" });
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.libelle.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive",
      });
      return;
    }

    // Validation du code (uniquement lettres majuscules)
    const codeRegex = /^[A-Z]{2,10}$/;
    if (!codeRegex.test(formData.code)) {
      toast({
        title: "Erreur",
        description:
          "Le code doit contenir uniquement des lettres majuscules (2-10 caractères).",
        variant: "destructive",
      });
      return;
    }

    try {
      const now = new Date();
      if (editingMethod) {
        // Mise à jour
        await db.paymentMethods.update(editingMethod.id!, {
          code: formData.code.toUpperCase().trim(),
          libelle: formData.libelle.trim(),
          updatedAt: now,
        });
        toast({
          title: "Mode de paiement mis à jour",
          description: `Le mode "${formData.libelle}" a été mis à jour.`,
        });
      } else {
        // Vérifier si le code existe déjà
        const exists = await db.paymentMethods
          .filter((pm) => pm.code === formData.code.toUpperCase())
          .first();

        if (exists) {
          toast({
            title: "Erreur",
            description: `Le code "${formData.code}" existe déjà.`,
            variant: "destructive",
          });
          return;
        }

        // Création
        await db.paymentMethods.add({
          code: formData.code.toUpperCase().trim(),
          libelle: formData.libelle.trim(),
          active: true,
          createdAt: now,
          updatedAt: now,
        });
        toast({
          title: "Mode de paiement créé",
          description: `Le mode "${formData.libelle}" a été créé.`,
        });
      }

      await loadPaymentMethods();
      handleCloseDialog();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le mode de paiement.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (method: PaymentMethod) => {
    try {
      const newActiveState = !method.active;
      await db.paymentMethods.update(method.id!, {
        active: newActiveState,
        updatedAt: new Date(),
      });
      await loadPaymentMethods();
      toast({
        title: newActiveState
          ? "Mode de paiement activé"
          : "Mode de paiement désactivé",
        description: `Le mode "${method.libelle}" a été ${
          newActiveState ? "activé" : "désactivé"
        }.`,
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le mode de paiement.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (method: PaymentMethod) => {
    if (
      !window.confirm(
        `Êtes-vous sûr de vouloir supprimer le mode de paiement "${method.libelle}" ?`
      )
    ) {
      return;
    }

    try {
      await db.paymentMethods.delete(method.id!);
      await loadPaymentMethods();
      toast({
        title: "Mode de paiement supprimé",
        description: `Le mode "${method.libelle}" a été supprimé.`,
      });
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le mode de paiement.",
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
              <CreditCard className="h-5 w-5" />
              Gestion des modes de paiement
            </CardTitle>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau mode
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun mode de paiement configuré.</p>
              <p className="text-sm">
                Cliquez sur "Nouveau mode" pour en créer un.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentMethods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell className="font-mono font-semibold">
                      {method.code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {method.libelle}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={method.active}
                          onCheckedChange={() => handleToggleActive(method)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {method.active ? "Actif" : "Inactif"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(method)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(method)}
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
              {editingMethod
                ? "Modifier le mode de paiement"
                : "Nouveau mode de paiement"}
            </DialogTitle>
            <DialogDescription>
              Les modes de paiement actifs seront disponibles lors de la
              création de clients.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                placeholder="Ex: ESP, VIR, CB..."
                maxLength={10}
                disabled={!!editingMethod} // Le code ne peut pas être modifié
              />
              <p className="text-xs text-muted-foreground">
                Code court en majuscules (2-10 caractères). Ex: ESP, VIR, PRVT,
                CB, CHQ
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="libelle">Libellé *</Label>
              <Input
                id="libelle"
                value={formData.libelle}
                onChange={(e) =>
                  setFormData({ ...formData, libelle: e.target.value })
                }
                placeholder="Ex: Espèce, Virement, Chèque..."
              />
              <p className="text-xs text-muted-foreground">
                Description complète du mode de paiement
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              {editingMethod ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
