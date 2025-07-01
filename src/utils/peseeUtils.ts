
import { Product } from '@/lib/database';
import { PeseeTab } from '@/hooks/usePeseeTabs';

export const generatePrintContent = (formData: PeseeTab['formData'], products: Product[], isInvoice = false) => {
  const selectedProduct = products.find(p => p.id === formData.produitId);
  const net = Math.abs(formData.poidsEntree - formData.poidsSortie);
  const prixHT = net * (selectedProduct?.prixHT || 0);
  const prixTTC = net * (selectedProduct?.prixTTC || 0);
  
  const clientLabel = formData.typeClient === 'particulier' ? 'Client' : 'Entreprise';
  const documentTitle = isInvoice ? 'FACTURE' : 'BON DE PESÉE';
  
  const bonContent = `
    <div class="bon">
      <div class="header">
        <h2>${documentTitle}</h2>
        <p>N° ${formData.numeroBon}</p>
      </div>
      <div class="row">
        <span class="label">Date:</span>
        <span>${new Date().toLocaleDateString()}</span>
      </div>
      <div class="row">
        <span class="label">${clientLabel}:</span>
        <span>${formData.nomEntreprise}</span>
      </div>
      <div class="row">
        <span class="label">Plaque:</span>
        <span>${formData.plaque}</span>
      </div>
      ${formData.chantier ? `
      <div class="row">
        <span class="label">Chantier:</span>
        <span>${formData.chantier}</span>
      </div>
      ` : ''}
      <div class="row">
        <span class="label">Produit:</span>
        <span>${selectedProduct?.nom || 'Non défini'}</span>
      </div>
      <div class="row">
        <span class="label">Poids Net:</span>
        <span>${net.toFixed(2)} T</span>
      </div>
      <div class="row">
        <span class="label">Paiement:</span>
        <span>${formData.moyenPaiement}</span>
      </div>
      <div class="total">
        <strong>Total HT: ${prixHT.toFixed(2)}€</strong><br>
        <strong>Total TTC: ${prixTTC.toFixed(2)}€</strong>
      </div>
    </div>
  `;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${isInvoice ? 'Facture' : 'Bon de pesée'}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .bon { border: 2px solid #000; padding: 20px; margin-bottom: 20px; width: calc(50% - 40px); float: left; box-sizing: border-box; }
        .header { text-align: center; margin-bottom: 20px; }
        .row { display: flex; justify-content: space-between; margin: 8px 0; }
        .label { font-weight: bold; }
        .total { background: #f0f0f0; padding: 10px; margin-top: 15px; text-align: center; }
        @media print { 
          @page { size: A5 landscape; margin: 10mm; } 
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      ${bonContent}
      ${(formData.moyenPaiement === 'Direct' && !isInvoice) ? bonContent : ''}
    </body>
    </html>
  `;
};

export const handlePrint = (formData: PeseeTab['formData'], products: Product[], isInvoice = false) => {
  const printContent = generatePrintContent(formData, products, isInvoice);
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  }
};

export const handlePrintBothBonAndInvoice = (formData: PeseeTab['formData'], products: Product[]) => {
  // Imprimer le bon
  handlePrint(formData, products, false);
  
  // Attendre un peu puis imprimer la facture
  setTimeout(() => {
    handlePrint(formData, products, true);
  }, 1000);
};
