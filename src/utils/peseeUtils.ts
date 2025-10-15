import {
  Product,
  Transporteur,
  Client,
  UserSettings,
  db,
} from "@/lib/database";
import { PeseeTab } from "@/hooks/usePeseeTabs";
import { generateInvoiceContent } from "./invoiceUtils";

export const generatePrintContent = async (
  formData: PeseeTab["formData"],
  products: Product[],
  transporteurs: Transporteur[],
  isInvoice = false,
  client: Client | null = null
) => {
  // Récupérer les paramètres utilisateur pour le SIRET
  const userSettingsData = await db.userSettings.toArray();
  const userSettings = userSettingsData[0];
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
    return getTransporteurNameForSave(
      formData,
      transporteurs,
      formData.transporteurLibre
    );
  };

  // Les poids sont déjà en tonnes
  const poidsEntree = parseFloat(formData.poidsEntree.replace(",", ".")) || 0;
  const poidsSortie = parseFloat(formData.poidsSortie.replace(",", ".")) || 0;
  const net = Math.abs(poidsEntree - poidsSortie);

  const clientLabel =
    formData.typeClient === "particulier" ? "Client" : "Entreprise";
  const documentTitle = "Bon de pesée";

  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR");
  const timeStr = now.toLocaleTimeString("fr-FR");

  const bonContent = (copyType: string) => `
    <div class="bon">
      <div class="header">
        <div class="company-info">
          <div class="company-name">BDV ${
            userSettings?.siret ? `- SIRET: ${userSettings.siret}` : ""
          }</div>
          <div class="address">600, chemin de la Levade, Les Iscles</div>
          
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
          <div class="row">
            <span class="label">Produit:</span>
            <span>${selectedProduct?.nom || "Non défini"}</span>
          </div>
        </div>
        
        <div class="column-center">
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
            <span class="label">Poids Entrée:</span>
            <span>${poidsEntree.toFixed(3)} tonnes</span>
          </div>
        </div>
        
        <div class="column-right">
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
      </div>
      
      <div class="signatures-bottom">
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
        
        <div class="signature-section">
          <div class="signature-client">
            <p class="signature-label">Signature Client:</p>
            <div class="signature-line"></div>
          </div>
        </div>
      </div>
      
      <div class="mention-legale">
        <p><strong>Important:</strong> Tous les chauffeurs prenant livraison de matériaux sont tenus de vérifier au passage de la bascule, le poids de leur chargement et de faire le nécessaire en cas de surcharge.</p>
      </div>
    </div>
    
    <div class="copy-type">
      <p>${copyType}</p>
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
        
        .print-timestamp {
          position: fixed;
          top: 5px;
          right: 10px;
          font-size: 8px;
          color: #666;
          z-index: 1000;
        }
        
        .print-container {
          width: 100%;
          max-width: none;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 3rem;
          padding: 5px;
          margin-top: 20px; /* Espacement supplémentaire pour éviter le chevauchement avec le timestamp */
        }
        
        .bon { 
          border: 2px solid #000; 
          padding: 12px; 
          width: 100%;
          min-height: 320px;
          max-height: 390px;
          box-sizing: border-box; 
          background: white;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-size: 10px;
          position: relative;
          z-index: 2;
        }
        
        .header { 
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
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
        
        .column-left, .column-center, .column-right {
          flex: 1;
          min-width: 120px;
          display: flex;
          flex-direction: column;
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
          margin-top: auto;
          padding-top: 6px;
          border-top: 1px solid #ddd;
          height: 60px;
        }
        
        .signatures-bottom {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
        }
        
        .signatures-bottom .signature-section {
          margin-top: 0;
          border-top: none;
          height: auto;
          flex: 1;
          margin: 0 10px;
        }
        
        .signature-label {
          font-size: 9px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #555;
        }
        
        .signature-bdv .signature-area {
          height: 40px;
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
          height: 40px;
          border: 1px solid #ccc;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
        }
        
        .mention-legale { 
          background: #f8f8f8; 
          border: 1px solid #ddd;
          padding: 6px; 
          margin: 20px 0 0 0; 
          font-size: 7px; 
          text-align: justify; 
          line-height: 1.1;
        }
        
        .copy-type { 
          text-align: center; 
          margin-top: 5px; 
          font-weight: bold; 
          font-size: 11px;
          border: 2px solid #000;
          padding: 5px;
          background: #f0f0f0;
          position: relative;
          z-index: 1;
        }
        
        
        @media screen and (max-width: 768px) {
          .content-columns {
            flex-direction: column;
            gap: 15px;
          }
          
          .column-left, .column-center, .column-right {
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
          
          .signatures-bottom {
            flex-direction: column;
            gap: 15px;
          }
          
          .signatures-bottom .signature-section {
            margin: 0;
          }
        }
        
        @media print { 
          @page { 
            size: A4 portrait; 
            margin: 5mm; 
          } 
          body { 
            margin: 0; 
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
            height: 100vh;
            overflow: hidden;
          }
          .print-timestamp {
            position: fixed !important;
            top: 5px !important;
            right: 10px !important;
            font-size: 8px !important;
            color: #666 !important;
            z-index: 10000 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          /* Masquer tous les éléments de l'interface */
          [data-lov-id],
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
          /* Mettre en avant-plan le contenu du bon */
          .print-container {
            page-break-inside: avoid;
            max-width: none;
            width: 100%;
            flex-direction: column !important;
            gap: 2rem !important;
            padding: 0;
            margin-top: 20px !important; /* Espacement supplémentaire pour éviter le chevauchement avec le timestamp */
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: static !important;
            z-index: 9999 !important;
          }
          .bon {
            width: 100%;
            margin-bottom: 1rem !important;
            page-break-inside: avoid;
            min-height: 320px;
            max-height: 390px;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            z-index: 9999 !important;
            clear: both !important;
          }
          .copy-type {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            z-index: 9999 !important;
            margin-bottom: 2rem !important;
            clear: both !important;
          }
          .bon + .bon {
            margin-top: 2rem;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-timestamp">
        Imprimé le ${dateStr} à ${timeStr}
      </div>
      <div class="print-container">
        ${bonContent("Copie Client")}
        ${bonContent("Copie BDV")}
      </div>
    </body>
    </html>
  `;
};

export const handlePrint = async (
  formData: PeseeTab["formData"],
  products: Product[],
  transporteurs: Transporteur[],
  isInvoice = false,
  client: Client | null = null
) => {
  const printContent = await generatePrintContent(
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
export const handlePrintDirect = async (
  formData: PeseeTab["formData"],
  products: Product[],
  transporteurs: Transporteur[],
  isInvoice = false,
  client: Client | null = null
) => {
  const printContent = await generatePrintContent(
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
  if (!formData) return { bonContent: "", invoiceContent: "" };

  // Générer le contenu du Bon de pesée
  const bonContent = await generatePrintContent(
    formData,
    products,
    transporteurs,
    false
  );

  // Générer le contenu de la facture
  const { generateInvoiceContent } = await import("@/utils/invoiceUtils");
  const invoiceContent = await generateInvoiceContent(
    formData,
    products,
    transporteurs,
    client || null
  );

  // Créer un document unifié avec des styles cohérents
  const combinedContent = generateCombinedPrintContent(
    bonContent,
    invoiceContent
  );

  return { bonContent: combinedContent, invoiceContent: "" };
};

// Nouvelle fonction pour générer un contenu combiné avec des styles unifiés
const generateCombinedPrintContent = (
  bonContent: string,
  invoiceContent: string
): string => {
  // Extraire le contenu du bon (sans les balises HTML complètes)
  const bonBodyMatch = bonContent.match(/<body[^>]*>([\s\S]*?)<\/body>/);
  const bonBodyContent = bonBodyMatch ? bonBodyMatch[1] : bonContent;

  // Extraire le contenu de la facture (sans les balises HTML complètes)
  const invoiceBodyMatch = invoiceContent.match(
    /<body[^>]*>([\s\S]*?)<\/body>/
  );
  const invoiceBodyContent = invoiceBodyMatch
    ? invoiceBodyMatch[1]
    : invoiceContent;

  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR");
  const timeStr = now.toLocaleTimeString("fr-FR");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bon de pesée + Facture</title>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 0; 
          background: white;
          font-size: 11px;
          line-height: 1.4;
        }
        
        .print-timestamp {
          position: fixed;
          top: 5px;
          right: 10px;
          font-size: 8px;
          color: #666;
          z-index: 1000;
        }
        
        /* Styles pour le bon de pesée */
        .bon-section {
          page-break-after: always;
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 5px;
          margin-top: 20px; /* Espacement supplémentaire pour éviter le chevauchement avec le timestamp */
          box-sizing: border-box;
          position: relative; /* Pour positionner le timestamp relativement à cette section */
        }
        
        .bon-section .print-timestamp {
          position: absolute;
          top: 5px;
          right: 10px;
          font-size: 8px;
          color: #666;
          z-index: 1000;
        }
        
        .bon-section:last-child {
          page-break-after: auto;
        }
        
        .bon { 
          border: 2px solid #000; 
          padding: 12px; 
          width: 100%;
          min-height: 320px;
          max-height: 390px;
          box-sizing: border-box; 
          background: white;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-size: 10px;
          position: relative;
          z-index: 2;
        }
        
        .header { 
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
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
        
        .column-left, .column-center, .column-right {
          flex: 1;
          min-width: 120px;
          display: flex;
          flex-direction: column;
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
          margin-top: auto;
          padding-top: 6px;
          border-top: 1px solid #ddd;
          height: 60px;
        }
        
        .signatures-bottom {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
        }
        
        .signatures-bottom .signature-section {
          margin-top: 0;
          border-top: none;
          height: auto;
          flex: 1;
          margin: 0 10px;
        }
        
        .signature-label {
          font-size: 9px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #555;
        }
        
        .signature-bdv .signature-area {
          height: 40px;
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
          height: 40px;
          border: 1px solid #ccc;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
        }
        
        .mention-legale { 
          background: #f8f8f8; 
          border: 1px solid #ddd;
          padding: 6px; 
          margin: 20px 0 0 0; 
          font-size: 7px; 
          text-align: justify; 
          line-height: 1.1;
        }
        
        .copy-type { 
          text-align: center; 
          margin-top: 5px; 
          font-weight: bold; 
          font-size: 11px;
          border: 2px solid #000;
          padding: 5px;
          background: #f0f0f0;
          position: relative;
          z-index: 1;
        }
        
        /* Styles pour la facture */
        .invoice-section {
          width: 100%;
          padding: 0;
          margin: 0;
        }
        
        .invoice-container {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          box-sizing: border-box;
          background: white;
        }
        
        .invoice-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20mm;
          border-bottom: 2px solid #333;
          padding-bottom: 5mm;
        }
        
        .invoice-company-info {
          width: 45%;
        }
        
        .invoice-company-name {
          font-size: 20px;
          font-weight: bold;
          color: #333;
          margin-bottom: 3mm;
        }
        
        .invoice-company-details {
          font-size: 10px;
          line-height: 1.3;
          color: #666;
        }
        
        .invoice-info {
          width: 45%;
          text-align: right;
        }
        
        .invoice-title {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          margin-bottom: 5mm;
        }
        
        .invoice-number {
          font-size: 14px;
          font-weight: bold;
          color: #666;
          margin-bottom: 2mm;
        }
        
        .invoice-date {
          font-size: 11px;
          color: #666;
        }
        
        .client-section {
          margin-bottom: 15mm;
        }
        
        .client-title {
          font-size: 12px;
          font-weight: bold;
          color: #333;
          margin-bottom: 3mm;
          padding: 2mm;
          background: #f8f8f8;
          border-left: 4px solid #333;
        }
        
        .client-info {
          margin-left: 5mm;
        }
        
        .client-line {
          margin-bottom: 1mm;
          font-size: 11px;
        }
        
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10mm;
          font-size: 10px;
        }
        
        .details-table th {
          background: #333;
          color: white;
          padding: 3mm;
          text-align: left;
          font-weight: bold;
        }
        
        .details-table td {
          padding: 3mm;
          border-bottom: 1px solid #ddd;
        }
        
        .details-table .amount {
          text-align: right;
          font-weight: bold;
        }
        
        .totals-section {
          width: 50%;
          margin-left: auto;
          margin-bottom: 15mm;
        }
        
        .totals-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        
        .totals-table td {
          padding: 2mm 3mm;
          border-bottom: 1px solid #ddd;
        }
        
        .totals-table .label {
          font-weight: bold;
        }
        
        .totals-table .amount {
          text-align: right;
          font-weight: bold;
        }
        
        .total-final {
          background: #333;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        
        .payment-info {
          background: #f8f8f8;
          padding: 5mm;
          margin-bottom: 10mm;
          border: 1px solid #ddd;
        }
        
        .payment-title {
          font-weight: bold;
          margin-bottom: 2mm;
        }
        
        .legal-mentions {
          font-size: 8px;
          color: #666;
          line-height: 1.2;
          border-top: 1px solid #ddd;
          padding-top: 5mm;
        }
        
        @media print { 
          @page { 
            size: A4 portrait; 
            margin: 5mm; 
          } 
          body { 
            margin: 0; 
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
            height: 100vh;
            overflow: hidden;
          }
          .print-timestamp {
            position: fixed !important;
            top: 5px !important;
            right: 10px !important;
            font-size: 8px !important;
            color: #666 !important;
            z-index: 10000 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          .bon-section {
            page-break-after: always !important;
            page-break-inside: avoid !important;
            width: 100% !important;
            margin: 0 !important;
            margin-top: 20px !important; /* Espacement supplémentaire pour éviter le chevauchement avec le timestamp */
            padding: 5px !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            z-index: 9999 !important;
          }
          .bon-section .print-timestamp {
            position: absolute !important;
            top: 5px !important;
            right: 10px !important;
            font-size: 8px !important;
            color: #666 !important;
            z-index: 10000 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          .bon-section:last-child {
            page-break-after: auto !important;
          }
          .invoice-section {
            page-break-inside: avoid !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: static !important;
            z-index: 9999 !important;
          }
          .bon {
            width: 100% !important;
            margin-bottom: 1rem !important;
            page-break-inside: avoid !important;
            min-height: 320px !important;
            max-height: 390px !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            z-index: 9999 !important;
            clear: both !important;
          }
          .copy-type {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            z-index: 9999 !important;
            margin-bottom: 2rem !important;
            clear: both !important;
          }
          .invoice-container {
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: static !important;
            z-index: 9999 !important;
            page-break-inside: avoid !important;
          }
          /* Masquer tous les éléments de l'interface */
          [data-lov-id],
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
        }
      </style>
    </head>
    <body>
      <!-- Section Bon de pesée avec timestamp -->
      <div class="bon-section">
        <div class="print-timestamp">
          Imprimé le ${dateStr} à ${timeStr}
        </div>
        ${bonBodyContent}
      </div>
      
      <!-- Section Facture sans timestamp -->
      <div class="invoice-section">
        ${invoiceBodyContent}
      </div>
    </body>
    </html>
  `;
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
    transporteurLibreFromData: currentData?.transporteurLibre,
  });

  // Si l'utilisateur a saisi un transporteur libre (priorité absolue)
  if (transporteurLibre && transporteurLibre.trim()) {
    console.log(
      "🚛 Utilisation transporteurLibre paramètre:",
      transporteurLibre.trim()
    );
    return transporteurLibre.trim();
  }

  // Si un transporteur libre est stocké dans currentData
  if (currentData?.transporteurLibre && currentData.transporteurLibre.trim()) {
    console.log(
      "🚛 Utilisation transporteurLibre depuis currentData:",
      currentData.transporteurLibre.trim()
    );
    return currentData.transporteurLibre.trim();
  }

  // Si un transporteur officiel est sélectionné
  if (currentData?.transporteurId && currentData.transporteurId > 0) {
    const selectedTransporteur = transporteurs.find(
      (t) => t.id === currentData.transporteurId
    );
    const result = selectedTransporteur
      ? `${selectedTransporteur.prenom} ${selectedTransporteur.nom}`
      : "";
    console.log("🚛 Utilisation transporteur officiel:", result);
    return result;
  }

  // Auto-remplissage basé sur le nom d'entreprise/client si aucun transporteur n'est défini
  if (currentData?.nomEntreprise && currentData.nomEntreprise.trim()) {
    if (currentData.typeClient === "particulier") {
      console.log(
        "🚛 Utilisation nom entreprise (particulier):",
        currentData.nomEntreprise.trim()
      );
      return currentData.nomEntreprise.trim();
    } else if (
      currentData.typeClient === "professionnel" ||
      currentData.typeClient === "micro-entreprise"
    ) {
      console.log(
        "🚛 Utilisation nom entreprise (professionnel):",
        currentData.nomEntreprise.trim()
      );
      return currentData.nomEntreprise.trim();
    }
  }

  console.log("🚛 Aucun transporteur trouvé, retour chaîne vide");
  return "";
};
