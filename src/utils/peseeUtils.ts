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
  
  // Les poids sont déjà en tonnes
  const poidsEntree = parseFloat(formData.poidsEntree.replace(',', '.')) || 0;
  const poidsSortie = parseFloat(formData.poidsSortie.replace(',', '.')) || 0;
  const net = Math.abs(poidsEntree - poidsSortie);
  
  const clientLabel = formData.typeClient === 'particulier' ? 'Client' : 'Entreprise';
  const documentTitle = isInvoice ? 'FACTURE' : 'BON DE PESÉE';
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR');
  const timeStr = now.toLocaleTimeString('fr-FR');
  
  const bonContent = (copyType: string) => `
    <div class="bon">
      <div class="header">
        <div class="company-info">
          <div class="company-name">BDV</div>
          <div class="address">600, chemin de la Levade</div>
          <div class="address">Les Iscles</div>
          <div class="address">06550 LA ROQUETTE-SUR-SIAGNE</div>
          <div class="phone">Tél : 07 85 99 19 99</div>
        </div>
        <div class="document-title">
          <h2>${documentTitle}</h2>
          <p>N° ${formData.numeroBon}</p>
          <p>Le ${dateStr} à ${timeStr}</p>
        </div>
      </div>
      
      <div class="content">
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
          <span>${poidsEntree.toFixed(3)} tonnes</span>
        </div>
        <div class="row">
          <span class="label">Poids Sortie:</span>
          <span>${poidsSortie.toFixed(3)} tonnes</span>
        </div>
        <div class="row">
          <span class="label">Poids Net:</span>
          <span>${net.toFixed(3)} tonnes</span>
        </div>
        <div class="row">
          <span class="label">Paiement:</span>
          <span>${formData.moyenPaiement}</span>
        </div>
      </div>
      
      <div class="mention-legale">
        <p><strong>Important:</strong> Tous les chauffeurs prenant livraison de matériaux sont tenus de vérifier au passage de la bascule, le poids de leur chargement et de faire le nécessaire en cas de surcharge.</p>
      </div>
      
      <div class="copy-type">
        <p>${copyType}</p>
      </div>
    </div>
  `;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${isInvoice ? 'Facture' : 'Bon de pesée'}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 0; 
          background: white;
          width: 210mm;
          height: 297mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }
        
        .print-container {
          width: 210mm;
          height: 297mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 10mm 0;
          box-sizing: border-box;
        }
        
        .bon { 
          border: 2px solid #000; 
          padding: 5mm; 
          width: 120mm;
          height: 115mm;
          box-sizing: border-box; 
          background: white;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          margin: 5mm 0;
        }
        
        .header { 
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 5mm; 
          border-bottom: 1px solid #ccc;
          padding-bottom: 4mm;
        }
        
        .company-info {
          text-align: left;
          font-size: 9px;
          line-height: 1.2;
          width: 50mm;
        }
        
        .company-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 2mm;
        }
        
        .address, .phone {
          margin-bottom: 0.5mm;
        }
        
        .document-title { 
          text-align: center; 
          flex-grow: 1;
        }
        
        .document-title h2 {
          font-size: 14px;
          margin: 0 0 3mm 0;
          font-weight: bold;
        }
        
        .document-title p {
          margin: 1mm 0;
          font-size: 10px;
        }
        
        .content {
          flex-grow: 1;
          margin: 4mm 0;
        }
        
        .row { 
          display: flex; 
          justify-content: space-between; 
          margin: 2mm 0; 
          padding: 1mm 0;
          border-bottom: 1px dotted #ccc;
          font-size: 9px;
        }
        
        .label { 
          font-weight: bold; 
          width: 45%;
        }
        
        .row span:last-child {
          width: 50%;
          text-align: right;
        }
        
        .mention-legale { 
          background: #f8f8f8; 
          border: 1px solid #ddd;
          padding: 3mm; 
          margin: 3mm 0; 
          font-size: 7px; 
          text-align: justify; 
          line-height: 1.1;
        }
        
        .copy-type { 
          text-align: center; 
          margin-top: 3mm; 
          font-weight: bold; 
          font-size: 10px;
          border: 2px solid #000;
          padding: 2mm;
          background: #f0f0f0;
        }
        
        @media print { 
          @page { 
            size: A4 portrait; 
            margin: 0; 
          } 
          body { 
            margin: 0; 
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-container {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-container">
        ${bonContent('Copie Client')}
        ${bonContent('Copie BDV')}
      </div>
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
