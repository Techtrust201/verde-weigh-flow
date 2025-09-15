import { Product, Transporteur, Client } from "@/lib/database";
import { PeseeTab } from "@/hooks/usePeseeTabs";

export const generateInvoiceContent = (
  formData: PeseeTab["formData"],
  products: Product[],
  transporteurs: Transporteur[],
  client: Client | null
) => {
  const selectedProduct = products.find((p) => p.id === formData.produitId);
  const selectedTransporteur = transporteurs.find(
    (t) => t.id === formData.transporteurId
  );

  // Calculs des poids et prix
  const poidsEntree = parseFloat(formData.poidsEntree.replace(",", ".")) || 0;
  const poidsSortie = parseFloat(formData.poidsSortie.replace(",", ".")) || 0;
  const net = Math.abs(poidsEntree - poidsSortie);

  const prixUnitaireHT = selectedProduct?.prixHT || 0;
  const totalHT = net * prixUnitaireHT;
  const tauxTVA = selectedProduct?.tauxTVA || 20;
  const montantTVA = totalHT * (tauxTVA / 100);
  const totalTTC = totalHT + montantTVA;

  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR");
  const numeroFacture = `FAC-${formData.numeroBon}`;

  // Informations client conditionnelles
  const getClientInfo = () => {
    if (!client) {
      return {
        nom: formData.nomEntreprise,
        lignes: [`<div class="client-line">${formData.nomEntreprise}</div>`],
      };
    }

    const lignes = [];

    if (client.typeClient === "particulier") {
      if (client.prenom && client.nom) {
        lignes.push(
          `<div class="client-line">${client.prenom} ${client.nom}</div>`
        );
      } else {
        lignes.push(`<div class="client-line">${client.raisonSociale}</div>`);
      }
    } else {
      lignes.push(
        `<div class="client-line"><strong>${client.raisonSociale}</strong></div>`
      );
      if (client.siret) {
        lignes.push(`<div class="client-line">SIRET: ${client.siret}</div>`);
      }
    }

    if (client.adresse) {
      lignes.push(`<div class="client-line">${client.adresse}</div>`);
    }
    if (client.codePostal && client.ville) {
      lignes.push(
        `<div class="client-line">${client.codePostal} ${client.ville}</div>`
      );
    }

    return {
      nom:
        client.typeClient === "particulier"
          ? client.prenom && client.nom
            ? `${client.prenom} ${client.nom}`
            : client.raisonSociale
          : client.raisonSociale,
      lignes,
    };
  };

  const clientInfo = getClientInfo();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Facture ${numeroFacture}</title>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: 'Arial', sans-serif; 
          margin: 0; 
          padding: 0; 
          background: white;
          font-size: 11px;
          line-height: 1.4;
        }
        
        .invoice-container {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          box-sizing: border-box;
          background: white;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20mm;
          border-bottom: 2px solid #333;
          padding-bottom: 5mm;
        }
        
        .company-info {
          width: 45%;
        }
        
        .company-name {
          font-size: 20px;
          font-weight: bold;
          color: #333;
          margin-bottom: 3mm;
        }
        
        .company-details {
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
            margin: 0; 
          } 
          body { 
            margin: 0; 
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="company-info">
            <div class="company-name">BDV</div>
            <div class="company-details">
              600, chemin de la Levade
              Les Iscles<br>
              06550 LA ROQUETTE-SUR-SIAGNE<br>
              Tél : 07 85 99 19 99
            </div>
          </div>
          <div class="invoice-info">
            <div class="invoice-title">FACTURE</div>
            <div class="invoice-number">N° ${numeroFacture}</div>
            <div class="invoice-date">Date d'émission : ${dateStr}</div>
            <div class="invoice-date">Date de livraison : ${dateStr}</div>
          </div>
        </div>

        <div class="client-section">
          <div class="client-title">FACTURÉ À</div>
          <div class="client-info">
            ${clientInfo.lignes.join("")}
          </div>
        </div>

        <table class="details-table">
          <thead>
            <tr>
              <th style="width: 50%;">Désignation</th>
              <th style="width: 15%;">Quantité</th>
              <th style="width: 15%;">Prix unitaire HT</th>
              <th style="width: 20%;">Total HT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Pesée de ${
                  selectedProduct?.nom || "Matériau"
                }</strong><br>
                <span style="font-size: 9px; color: #666;">
                  Plaque : ${formData.plaque}
                  ${
                    formData.chantier
                      ? `<br>Chantier : ${formData.chantier}`
                      : ""
                  }
                  ${
                    selectedTransporteur
                      ? `<br>Transporteur : ${selectedTransporteur.prenom} ${selectedTransporteur.nom}`
                      : ""
                  }
                </span>
              </td>
              <td class="amount">${net.toFixed(3)} T</td>
              <td class="amount">${prixUnitaireHT.toFixed(2)} €</td>
              <td class="amount">${totalHT.toFixed(2)} €</td>
            </tr>
          </tbody>
        </table>

        <div class="totals-section">
          <table class="totals-table">
            <tr>
              <td class="label">Total HT</td>
              <td class="amount">${totalHT.toFixed(2)} €</td>
            </tr>
            <tr>
              <td class="label">TVA (${tauxTVA}%)</td>
              <td class="amount">${montantTVA.toFixed(2)} €</td>
            </tr>
            <tr class="total-final">
              <td class="label">TOTAL TTC</td>
              <td class="amount">${totalTTC.toFixed(2)} €</td>
            </tr>
          </table>
        </div>

        <div class="payment-info">
          <div class="payment-title">CONDITIONS DE PAIEMENT</div>
          <div>Mode de paiement : ${formData.moyenPaiement}</div>
          ${
            formData.moyenPaiement === "En compte"
              ? "<div>Paiement à 30 jours fin de mois</div>"
              : "<div>Paiement à la livraison</div>"
          }
        </div>

        <div class="legal-mentions">
          <p><strong>Mentions légales :</strong></p>
          <p>• En cas de retard de paiement, seront exigibles, conformément à l'article L. 441-6 du code de commerce, une indemnité calculée sur la base de trois fois le taux de l'intérêt légal en vigueur ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 euros.</p>
          <p>• TVA non applicable, art. 293 B du CGI (le cas échéant)</p>
          <p>• Aucun escompte pour paiement anticipé.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
