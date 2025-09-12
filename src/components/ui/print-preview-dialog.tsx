import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

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

  const handlePrint = () => {
    setIsPrinting(true);
    
    // Créer un style temporaire pour l'impression
    const printStyles = `
      <style>
        @media print {
          body * {
            visibility: hidden;
          }
          #print-content, #print-content * {
            visibility: visible;
          }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          /* Masquer la dialog pendant l'impression */
          .print-preview-dialog {
            display: none !important;
          }
        }
      </style>
    `;

    // Injecter les styles dans le head
    const existingStyle = document.getElementById('print-preview-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const styleElement = document.createElement('div');
    styleElement.id = 'print-preview-styles';
    styleElement.innerHTML = printStyles;
    document.head.appendChild(styleElement);

    // Créer l'élément de contenu d'impression temporaire
    const printElement = document.createElement('div');
    printElement.id = 'print-content';
    printElement.innerHTML = content;
    printElement.style.display = 'none';
    document.body.appendChild(printElement);

    // Déclencher l'impression
    setTimeout(() => {
      window.print();
      
      // Nettoyage après impression
      setTimeout(() => {
        if (printElement) {
          document.body.removeChild(printElement);
        }
        if (document.getElementById('print-preview-styles')) {
          document.getElementById('print-preview-styles')?.remove();
        }
        setIsPrinting(false);
      }, 100);
    }, 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="print-preview-dialog max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex space-x-2">
              <Button 
                onClick={handlePrint} 
                disabled={isPrinting}
                className="flex items-center"
              >
                <Printer className="h-4 w-4 mr-2" />
                {isPrinting ? 'Impression...' : 'Imprimer'}
              </Button>
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto border rounded-lg bg-white">
          <div 
            dangerouslySetInnerHTML={{ __html: content }}
            className="p-4"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};