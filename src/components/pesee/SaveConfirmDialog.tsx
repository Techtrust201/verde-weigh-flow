import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save, Printer, FileText } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

interface SaveConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (typeDocument: "bon_livraison" | "facture" | "les_deux") => void;
  onConfirmAndPrint: (
    typeDocument: "bon_livraison" | "facture" | "les_deux"
  ) => void;
  onConfirmPrintAndInvoice?: (
    typeDocument: "bon_livraison" | "facture" | "les_deux"
  ) => void;
  moyenPaiement: "ESP" | "CB" | "CHQ" | "VIR" | "PRVT" | "Direct" | "En compte";
}

export const SaveConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  onConfirmAndPrint,
  onConfirmPrintAndInvoice,
  moyenPaiement,
}: SaveConfirmDialogProps) => {
  // État pour le type de document sélectionné
  const [typeDocument, setTypeDocument] = useState<
    "bon_livraison" | "facture" | "les_deux"
  >("bon_livraison");

  // Réinitialiser le typeDocument quand le dialogue s'ouvre
  useEffect(() => {
    if (isOpen) {
      setTypeDocument("bon_livraison");
    }
  }, [isOpen]);

  // Déterminer si c'est un paiement direct (afficher la facture)
  const isPaiementDirect = ["ESP", "CB", "CHQ", "Direct"].includes(
    moyenPaiement
  );

  const handleConfirm = () => {
    // Selon le typeDocument sélectionné, imprimer automatiquement
    if (typeDocument === "bon_livraison") {
      onConfirmAndPrint(typeDocument);
    } else if (typeDocument === "facture") {
      onConfirm(typeDocument);
    } else if (typeDocument === "les_deux" && onConfirmPrintAndInvoice) {
      onConfirmPrintAndInvoice(typeDocument);
    } else {
      // Fallback : sauvegarder sans imprimer
      onConfirm(typeDocument);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmer l'enregistrement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-4">
            <Label className="text-lg font-semibold">
              Type de document à valider :
            </Label>
            <RadioGroup
              value={typeDocument}
              onValueChange={(value) =>
                setTypeDocument(value as typeof typeDocument)
              }
              className="space-y-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem
                  value="bon_livraison"
                  id="bon_livraison"
                  className="h-6 w-6"
                />
                <Label
                  htmlFor="bon_livraison"
                  className="cursor-pointer font-normal text-base"
                >
                  Bon de livraison uniquement
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem
                  value="facture"
                  id="facture"
                  disabled={!isPaiementDirect}
                  className="h-6 w-6"
                />
                <Label
                  htmlFor="facture"
                  className={`cursor-pointer font-normal text-base ${
                    !isPaiementDirect ? "text-gray-400 cursor-not-allowed" : ""
                  }`}
                >
                  Facture uniquement{" "}
                  {!isPaiementDirect && "(Paiement direct requis)"}
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem
                  value="les_deux"
                  id="les_deux"
                  disabled={!isPaiementDirect}
                  className="h-6 w-6"
                />
                <Label
                  htmlFor="les_deux"
                  className={`cursor-pointer font-normal text-base ${
                    !isPaiementDirect ? "text-gray-400 cursor-not-allowed" : ""
                  }`}
                >
                  Bon de livraison + Facture{" "}
                  {!isPaiementDirect && "(Paiement direct requis)"}
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Le document sera enregistré et{" "}
              {typeDocument === "les_deux"
                ? "les deux documents seront"
                : "le document sera"}{" "}
              imprimé automatiquement.
            </p>
            <div className="flex flex-col space-y-2">
              <Button
                onClick={handleConfirm}
                className="flex items-center justify-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {typeDocument === "bon_livraison" && (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    Valider et imprimer le Bon de livraison
                  </>
                )}
                {typeDocument === "facture" && (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Valider et imprimer la Facture
                  </>
                )}
                {typeDocument === "les_deux" && (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    <FileText className="h-4 w-4 mr-2" />
                    Valider et imprimer Bon + Facture
                  </>
                )}
              </Button>
              <Button onClick={onClose} variant="destructive">
                Annuler
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
