import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { debugPrintContent } from "@/utils/printUtils";
interface PrintPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title?: string;
}
export const PrintPreviewDialog = ({
  isOpen,
  onClose,
  content,
  title = "Aperçu avant impression",
}: PrintPreviewDialogProps) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const handlePrint = () => {
    setIsPrinting(true);

    // Debug le contenu avant impression
    const debuggedContent = debugPrintContent(content);

    // Créer une nouvelle fenêtre pour l'impression avec le contenu complet
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (printWindow) {
      // Écrire le contenu HTML complet avec les styles
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Impression</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              background: white;
            }
            @media print { 
              body { 
                margin: 0; 
                padding: 0;
              }
              .page-break {
                page-break-before: always;
              }
              /* Masquer tous les éléments de l'interface dialog */
              [data-lov-id*="dialog.tsx"],
              [data-lov-id*="print-preview-dialog.tsx"],
              .fixed,
              .z-50,
              .bg-black\/80,
              .inset-0,
              .translate-x-\[-50\%\],
              .translate-y-\[-50\%\],
              .shadow-lg,
              .border,
              .bg-background,
              .p-6,
              .gap-4,
              .grid,
              .w-full,
              .duration-200,
              .animate-in,
              .animate-out,
              .fade-out-0,
              .fade-in-0,
              .zoom-out-95,
              .zoom-in-95,
              .slide-out-to-left-1\/2,
              .slide-out-to-top-\[48\%\],
              .slide-in-from-left-1\/2,
              .slide-in-from-top-\[48\%\],
              .sm\:rounded-lg,
              .print-preview-dialog,
              .max-w-4xl,
              .max-h-\[80vh\],
              .overflow-hidden {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                position: absolute !important;
                left: -9999px !important;
                top: -9999px !important;
                z-index: -9999 !important;
              }
              /* Afficher seulement le contenu du bon */
              .print-container,
              .bon,
              .copy-type {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: static !important;
                z-index: 1 !important;
              }
            }
            /* Copier tous les styles nécessaires */
            .bon, .invoice-container {
              width: 100%;
              max-width: 210mm;
              margin: 0 auto;
              background: white;
              color: black;
            }
            .print-container {
              display: flex;
              flex-direction: column;
              gap: 1rem;
                        padding: 5px;
            }
            .copy-type { 
              margin-top: 1rem;
              margin-bottom: 1rem;
              text-align: center; 
              font-weight: bold; 
              font-size: 11px;
              border: 2px solid #000;
              padding: 5px;
              background: #f0f0f0;
              position: relative;
              z-index: 1;
            }
            .bon {
              position: relative;
              z-index: 2;
            }
            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #333;
            }
            .address {
              color: #666;
              font-size: 12px;
            }
            .document-title {
              text-align: center;
              font-size: 20px;
              font-weight: bold;
              margin: 20px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #333;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .total-section {
              margin-top: 20px;
              text-align: right;
            }
            .total-line {
              margin: 5px 0;
              font-size: 14px;
            }
            .total-final {
              font-weight: bold;
              font-size: 16px;
              border-top: 2px solid #333;
              padding-top: 5px;
            }
          </style>
        </head>
        <body>
          ${debuggedContent}
        </body>
        </html>
      `);
      printWindow.document.close();

      // Attendre que le contenu soit chargé puis imprimer
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          setIsPrinting(false);
        }, 500);
      };
    } else {
      setIsPrinting(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="print-preview-dialog max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex space-x-2 mx-[20px]">
              <Button
                onClick={handlePrint}
                disabled={isPrinting}
                className="flex items-center"
              >
                <Printer className="h-4 w-4 mr-2" />
                {isPrinting ? "Impression..." : "Imprimer"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-lg bg-white max-h-[60vh]">
          <div
            dangerouslySetInnerHTML={{
              __html: content,
            }}
            className="p-4"
            style={{
              maxWidth: "210mm",
              margin: "0 auto",
              backgroundColor: "white",
              color: "black",
              fontFamily: "Arial, sans-serif",
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
