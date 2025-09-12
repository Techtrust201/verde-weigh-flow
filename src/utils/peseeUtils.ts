import { Product, Transporteur, Client } from "@/lib/database";
import { PeseeTab } from "@/hooks/usePeseeTabs";
import { generateInvoiceContent } from "./invoiceUtils";

export const generatePrintContent = (
  formData: PeseeTab["formData"],
  products: Product[],
  transporteurs: Transporteur[],
  isInvoice = false,
  client: Client | null = null
) => {
  // Si c'est une facture, utiliser la nouvelle fonction
  if (isInvoice) {
    return generateInvoiceContent(formData, products, transporteurs, client);
  }

  // Garder le code existant pour les bons de pesée
  const selectedProduct = products.find((p) => p.id === formData.produitId);
  const selectedTransporteur = transporteurs.find(
    (t) => t.id === formData.transporteurId
  );

  // Obtenir le nom du transporteur à afficher
  const getTransporteurName = () => {
    return getTransporteurNameForSave(formData, transporteurs, formData.transporteurLibre);
  };

  // Les poids sont déjà en tonnes
  const poidsEntree = parseFloat(formData.poidsEntree.replace(",", ".")) || 0;
  const poidsSortie = parseFloat(formData.poidsSortie.replace(",", ".")) || 0;
  const net = Math.abs(poidsEntree - poidsSortie);

  const clientLabel =
    formData.typeClient === "particulier" ? "Client" : "Entreprise";
  const documentTitle = "BON DE PESÉE";

  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR");
  const timeStr = now.toLocaleTimeString("fr-FR");

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
      
      <div class="content-columns">
        <div class="column-left">
          <div class="row">
            <span class="label">${clientLabel}:</span>
            <span>${formData.nomEntreprise}</span>
          </div>
          <div class="row">
            <span class="label">Plaque:</span>
            <span>${formData.plaque}</span>
          </div>
          ${
            getTransporteurName()
              ? `
          <div class="row">
            <span class="label">Transporteur:</span>
            <span>${getTransporteurName()}</span>
          </div>
          `
              : ""
          }
          ${
            formData.chantier
              ? `
          <div class="row">
            <span class="label">Chantier:</span>
            <span>${formData.chantier}</span>
          </div>
          `
              : ""
          }
          <div class="row">
            <span class="label">Produit:</span>
            <span>${selectedProduct?.nom || "Non défini"}</span>
          </div>
          
          <div class="signature-section">
            <div class="signature-bdv">
              <p class="signature-label">Signature BDV:</p>
              <div class="signature-area">
                <svg class="signature-scribble" viewBox="0 0 120 40" width="120" height="40">
                  <path d="M10,25 Q20,10 30,25 T50,25 Q60,15 70,25 T90,25 Q100,20 110,25" 
                        stroke="#000" stroke-width="2" fill="none" stroke-linecap="round"/>
                  <path d="M15,30 Q25,20 35,30 T55,30" 
                        stroke="#000" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        <div class="column-right">
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
          
          <div class="signature-section">
            <div class="signature-client">
              <p class="signature-label">Signature Client:</p>
              <div class="signature-line"></div>
            </div>
          </div>
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
      <title>Bon de pesée</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 10px; 
          background: white;
          min-height: 100vh;
        }
        
        .print-container {
          width: 100%;
          max-width: none;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 5px;
        }
        
        .bon { 
          border: 2px solid #000; 
          padding: 12px; 
          width: 100%;
          min-height: 320px;
          max-height: 380px;
          box-sizing: border-box; 
          background: white;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-size: 10px;
        }
        
        .header { 
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px; 
          border-bottom: 1px solid #ccc;
          padding-bottom: 8px;
          flex-wrap: wrap;
          gap: 5px;
        }
        
        .company-info {
          text-align: left;
          font-size: 10px;
          line-height: 1.2;
          flex: 1;
          min-width: 120px;
        }
        
        .company-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .address, .phone {
          margin-bottom: 2px;
        }
        
        .document-title { 
          text-align: center; 
          flex: 1;
          min-width: 120px;
        }
        
        .document-title h2 {
          font-size: 14px;
          margin: 0 0 5px 0;
          font-weight: bold;
        }
        
        .document-title p {
          margin: 2px 0;
          font-size: 11px;
        }
        
        .content-columns {
          display: flex;
          justify-content: space-between;
          flex-grow: 1;
          margin: 8px 0;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .column-left, .column-right {
          flex: 1;
          min-width: 120px;
        }
        
        .row { 
          display: flex; 
          flex-direction: column;
          margin: 4px 0; 
          padding: 3px 0;
          border-bottom: 1px dotted #ccc;
          font-size: 10px;
        }
        
        .label { 
          font-weight: bold; 
          margin-bottom: 2px;
          font-size: 9px;
          color: #555;
        }
        
        .row span:last-child {
          font-size: 11px;
          color: #000;
        }
        
        .signature-section {
          margin-top: 10px;
          padding-top: 6px;
          border-top: 1px solid #ddd;
        }
        
        .signature-label {
          font-size: 9px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #555;
        }
        
        .signature-bdv .signature-area {
          height: 35px;
          border: 1px solid #ccc;
          background: #fafafa;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
        }
        
        .signature-scribble {
          opacity: 0.8;
          width: 80px;
          height: 25px;
        }
        
        .signature-client .signature-line {
          border-bottom: 1px solid #000;
          height: 35px;
          border: 1px solid #ccc;
          background: white;
        }
        
        .mention-legale { 
          background: #f8f8f8; 
          border: 1px solid #ddd;
          padding: 6px; 
          margin: 6px 0; 
          font-size: 7px; 
          text-align: justify; 
          line-height: 1.1;
        }
        
        .copy-type { 
          text-align: center; 
          margin-top: 10px; 
          font-weight: bold; 
          font-size: 11px;
          border: 2px solid #000;
          padding: 5px;
          background: #f0f0f0;
        }
        
        @media screen and (max-width: 768px) {
          .content-columns {
            flex-direction: column;
            gap: 15px;
          }
          
          .column-left, .column-right {
            min-width: auto;
            width: 100%;
          }
          
          .header {
            flex-direction: column;
            text-align: center;
          }
          
          .company-info, .document-title {
            min-width: auto;
            width: 100%;
          }
        }
        
        @media print { 
          @page { 
            size: A4 portrait; 
            margin: 10mm; 
          } 
          body { 
            margin: 0; 
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-container {
            page-break-inside: avoid;
            max-width: none;
            width: 100%;
            flex-direction: column;
            gap: 5px;
            padding: 0;
          }
          .bon {
            width: 100%;
            margin-bottom: 0;
            page-break-inside: avoid;
            min-height: 320px;
            max-height: 380px;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-container">
        ${bonContent("Copie Client")}
        ${bonContent("Copie BDV")}
      </div>
    </body>
    </html>
  `;
};

export const handlePrint = (
  formData: PeseeTab["formData"],
  products: Product[],
  transporteurs: Transporteur[],
  isInvoice = false,
  client: Client | null = null
) => {
  const printContent = generatePrintContent(
    formData,
    products,
    transporteurs,
    isInvoice,
    client
  );

  // Au lieu d'ouvrir un nouvel onglet, retourner le contenu pour l'afficher dans une modal
  return printContent;
};

// Nouvelle fonction pour l'impression directe (ancienne fonction)
export const handlePrintDirect = (
  formData: PeseeTab["formData"],
  products: Product[],
  transporteurs: Transporteur[],
  isInvoice = false,
  client: Client | null = null
) => {
  const printContent = generatePrintContent(
    formData,
    products,
    transporteurs,
    isInvoice,
    client
  );

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  }
};

export const handlePrintBothBonAndInvoice = async (
  formData: PeseeTab["formData"],
  products: Product[],
  transporteurs: Transporteur[],
  client?: Client | null
) => {
  if (!formData) return { bonContent: '', invoiceContent: '' };

  // Générer le contenu du bon de pesée
  const bonContent = generatePrintContent(formData, products, transporteurs, false);
  
  // Générer le contenu de la facture
  const { generateInvoiceContent } = await import('@/utils/invoiceUtils');
  const invoiceContent = generateInvoiceContent(formData, products, transporteurs, client || null);
  
  return { bonContent, invoiceContent };
};

// Fonction pour obtenir le nom du transporteur pour la sauvegarde
export const getTransporteurNameForSave = (
  currentData: any,
  transporteurs: any[],
  transporteurLibre: string = ""
): string => {
  console.log("🚛 getTransporteurNameForSave - Données reçues:", {
    currentData,
    transporteurLibre,
    transporteurLibreFromData: currentData?.transporteurLibre
  });

  // Si l'utilisateur a saisi un transporteur libre (priorité absolue)
  if (transporteurLibre && transporteurLibre.trim()) {
    console.log("🚛 Utilisation transporteurLibre paramètre:", transporteurLibre.trim());
    return transporteurLibre.trim();
  }

  // Si un transporteur libre est stocké dans currentData
  if (currentData?.transporteurLibre && currentData.transporteurLibre.trim()) {
    console.log("🚛 Utilisation transporteurLibre depuis currentData:", currentData.transporteurLibre.trim());
    return currentData.transporteurLibre.trim();
  }

  // Si un transporteur officiel est sélectionné
  if (currentData?.transporteurId && currentData.transporteurId > 0) {
    const selectedTransporteur = transporteurs.find(t => t.id === currentData.transporteurId);
    const result = selectedTransporteur ? `${selectedTransporteur.prenom} ${selectedTransporteur.nom}` : "";
    console.log("🚛 Utilisation transporteur officiel:", result);
    return result;
  }
  
  // Auto-remplissage basé sur le nom d'entreprise/client si aucun transporteur n'est défini
  if (currentData?.nomEntreprise && currentData.nomEntreprise.trim()) {
    if (currentData.typeClient === "particulier") {
      console.log("🚛 Utilisation nom entreprise (particulier):", currentData.nomEntreprise.trim());
      return currentData.nomEntreprise.trim();
    } else if (currentData.typeClient === "professionnel" || currentData.typeClient === "micro-entreprise") {
      console.log("🚛 Utilisation nom entreprise (professionnel):", currentData.nomEntreprise.trim());
      return currentData.nomEntreprise.trim();
    }
  }
  
  console.log("🚛 Aucun transporteur trouvé, retour chaîne vide");
  return "";
};
