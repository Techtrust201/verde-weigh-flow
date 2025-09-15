import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { debugPrintContent } from '@/utils/printUtils';
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
  title = "Aperçu avant impression"
}: PrintPreviewDialogProps) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const previewHtml = useMemo(() => {
    const bodyMatches = Array.from(content.matchAll(/<body[^>]*>([\s\S]*?)<\/body>/gi));
    const segments = bodyMatches.length ? bodyMatches.map(m => m[1]) : [content];
    const cleaned = segments.map(seg => seg.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ''));
    return cleaned.join('<hr style="margin:16px 0;border:none;border-top:1px dashed #ccc" />');
  }, [content]);
  const handlePrint = () => {
    setIsPrinting(true);

    // Debug (garde les logs et évite les superpositions)
    debugPrintContent(content);

    // Extraire corps et styles et fusionner proprement
    const bodyMatches = Array.from(content.matchAll(/<body[^>]*>([\s\S]*?)<\/body>/gi));
    const styleMatches = Array.from(content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi));
    const mergedBodies = (bodyMatches.length ? bodyMatches.map(m => m[1]) : [content]);
    const mergedStyles = styleMatches.map(m => m[1]).join('\n');

    const mergedHtml = mergedBodies.join('<div class="page-break"></div>');

    // Créer une nouvelle fenêtre pour l'impression avec le contenu fusionné
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      // Écrire le contenu HTML complet avec les styles de base + ceux extraits
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Impression</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }
    @media print { 
      body { margin: 0; padding: 0; }
      .page-break { page-break-before: always; break-before: page; }
    }
    .bon, .invoice-container { width: 100%; max-width: 210mm; margin: 0 auto; background: white; color: black; }
  </style>
  <style>${mergedStyles}</style>
</head>
<body>
  ${mergedHtml}
</body>
</html>`);
      printWindow.document.close();

      // Attendre que le contenu soit chargé puis imprimer
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          setIsPrinting(false);
        }, 300);
      };
    } else {
      setIsPrinting(false);
    }
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="print-preview-dialog max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="sr-only">Aperçu et options d'impression</DialogDescription>
            </div>
            <div className="flex space-x-2 mx-[20px]">
              <Button onClick={handlePrint} disabled={isPrinting} className="flex items-center">
                <Printer className="h-4 w-4 mr-2" />
                {isPrinting ? 'Impression...' : 'Imprimer'}
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto border rounded-lg bg-white max-h-[60vh]">
          <div
            dangerouslySetInnerHTML={{ __html: previewHtml }}
            className="p-4"
            style={{
              maxWidth: '210mm',
              margin: '0 auto',
              backgroundColor: 'white',
              color: 'black',
              fontFamily: 'Arial, sans-serif'
            }}
          />
        </div>
      </DialogContent>
    </Dialog>;
};