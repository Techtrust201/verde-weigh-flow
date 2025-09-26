import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save, Printer, FileText } from "lucide-react";

interface SaveConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmAndPrint: () => void;
  onConfirmPrintAndInvoice?: () => void;
  moyenPaiement: "Direct" | "En compte";
}

export const SaveConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  onConfirmAndPrint,
  onConfirmPrintAndInvoice,
  moyenPaiement,
}: SaveConfirmDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer l'enregistrement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Comment souhaitez-vous procéder ?</p>
          <div className="flex flex-col space-y-2">
            <Button onClick={onConfirmAndPrint} className="flex items-center">
              <Save className="h-4 w-4 mr-2" />
              <Printer className="h-4 w-4 mr-2" />
              Imprimer le Bon de peséeeee
            </Button>
            {moyenPaiement === "Direct" && (
              <Button onClick={onConfirm} variant="outline">
                <Save className="h-4 w-4 mr-2" />
                <FileText className="h-4 w-4 mr-2" />
                Imprimer la facture
              </Button>
            )}
            {moyenPaiement === "Direct" && onConfirmPrintAndInvoice && (
              <Button onClick={onConfirmPrintAndInvoice} variant="secondary">
                <Save className="h-4 w-4 mr-2" />
                <Printer className="h-4 w-4 mr-2" />
                <FileText className="h-4 w-4 mr-2" />
                Imprimer bon + facture
              </Button>
            )}
            <Button onClick={onClose} variant="destructive">
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
