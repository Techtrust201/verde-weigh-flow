
import { Product, Transporteur } from '@/lib/database';
import { PeseeTab } from '@/hooks/usePeseeTabs';

export const generatePrintContent = (
  formData: PeseeTab['formData'], 
  products: Product[], 
  transporteurs: Transporteur[], 
  isInvoice = false
) => {
  const selectedProduct = products.find(p => p.id === formData.produitId);
  const selectedTransporteur = transporteurs.find(t => t.id === formData.transporteurId);
  
  const poidsEntree = parseFloat(formData.poidsEntree.replace(',', '.')) || 0;
  const poidsSortie = parseFloat(formData.poidsSortie.replace(',', '.')) || 0;
  const net = Math.abs(poidsEntree - poidsSortie);
  
  const clientLabel = formData.typeClient === 'particulier' ? 'Client' : 'Entreprise';
  const documentTitle = isInvoice ? 'FACTURE' : 'BON DE PESÉE';
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR');
  const timeStr = now.toLocaleTimeString('fr-FR');
  
  const bonContent = `
    <div class="bon">
      <div class="header">
        <h2>${documentTitle}</h2>
        <p>N° ${formData.numeroBon}</p>
        <p>Le ${dateStr} à ${timeStr}</p>
      </div>
      <div class="row">
        <span class="label">${clientLabel}:</span>
        <span>${formData.nomEntreprise}</span>
      </div>
      <div class="row">
        <span class="label">Plaque:</span>
        <span>${formData.plaque}</span>
      </div>
      ${selectedTransporteur ? `
      <div class="row">
        <span class="label">Transporteur:</span>
        <span>${selectedTransporteur.prenom} ${selectedTransporteur.nom}</span>
      </div>
      ` : ''}
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
        <span class="label">Poids Entrée:</span>
        <span>${poidsEntree.toFixed(3)} T</span>
      </div>
      <div class="row">
        <span class="label">Poids Sortie:</span>
        <span>${poidsSortie.toFixed(3)} T</span>
      </div>
      <div class="row">
        <span class="label">Poids Net:</span>
        <span>${net.toFixed(3)} T</span>
      </div>
      <div class="row">
        <span class="label">Paiement:</span>
        <span>${formData.moyenPaiement}</span>
      </div>
      <div class="mention-legale">
        <p><strong>Important:</strong> Tous les chauffeurs prenant livraison de matériaux sont tenus de vérifier au passage de la bascule, le poids de leur chargement et de faire le nécessaire en cas de surcharge.</p>
      </div>
      <div class="copy-type">
        <p>Copie Chauffeur</p>
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
        .bon { 
          border: 2px solid #000; 
          padding: 20px; 
          margin-bottom: 20px; 
          width: calc(50% - 40px); 
          float: left; 
          box-sizing: border-box; 
        }
        .header { text-align: center; margin-bottom: 20px; }
        .row { display: flex; justify-content: space-between; margin: 8px 0; }
        .label { font-weight: bold; }
        .mention-legale { 
          background: #f0f0f0; 
          padding: 10px; 
          margin-top: 15px; 
          font-size: 10px; 
          text-align: center; 
        }
        .copy-type { 
          text-align: center; 
          margin-top: 10px; 
          font-weight: bold; 
          font-size: 12px; 
        }
        @media print { 
          @page { size: A5 landscape; margin: 10mm; } 
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      ${bonContent}
      ${bonContent}
    </body>
    </html>
  `;
};

export const handlePrint = (
  formData: PeseeTab['formData'], 
  products: Product[], 
  transporteurs: Transporteur[], 
  isInvoice = false
) => {
  const printContent = generatePrintContent(formData, products, transporteurs, isInvoice);
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  }
};

export const handlePrintBothBonAndInvoice = (
  formData: PeseeTab['formData'], 
  products: Product[], 
  transporteurs: Transporteur[]
) => {
  // Imprimer le bon
  handlePrint(formData, products, transporteurs, false);
  
  // Attendre un peu puis imprimer la facture
  setTimeout(() => {
    handlePrint(formData, products, transporteurs, true);
  }, 1000);
};
