/**
 * Utilitaire pour générer des exports Sage 50 basés sur des templates
 */

import {
  Pesee,
  Product,
  Client,
  Transporteur,
  UserSettings,
  SageTemplate,
  ColumnMapping,
} from "@/lib/database";
import { db } from "@/lib/database";

export interface ExportData {
  pesee: Pesee;
  product?: Product;
  client?: Client;
  transporteur?: Transporteur;
  userSettings?: UserSettings;
}

export class SageTemplateExporter {
  private template: SageTemplate;
  private dataMap: Map<number, ExportData> = new Map();

  constructor(template: SageTemplate) {
    this.template = template;
  }

  async loadData(pesees: Pesee[]): Promise<void> {
    // Charger toutes les données nécessaires
    const [products, clients, transporteurs, userSettings] = await Promise.all([
      db.products.toArray(),
      db.clients.toArray(),
      db.transporteurs.toArray(),
      db.userSettings.toArray(),
    ]);

    // Créer des maps pour un accès rapide
    const productMap = new Map(products.map((p) => [p.id!, p]));
    const clientMap = new Map(clients.map((c) => [c.id!, c]));
    const transporteurMap = new Map(transporteurs.map((t) => [t.id!, t]));
    const userSettingsData = userSettings[0]; // Prendre le premier (normalement il n'y en a qu'un)

    // Préparer les données pour chaque pesée
    for (const pesee of pesees) {
      const exportData: ExportData = {
        pesee,
        product: productMap.get(pesee.produitId),
        client: pesee.clientId ? clientMap.get(pesee.clientId) : undefined,
        transporteur: pesee.transporteurId
          ? transporteurMap.get(pesee.transporteurId)
          : undefined,
        userSettings: userSettingsData,
      };
      this.dataMap.set(pesee.id!, exportData);
    }
  }

  generateExport(): string {
    // Générer l'en-tête avec les colonnes du template (comme dans le test)
    const headers = this.template.sageColumns.map((col) => col.name);
    const headerLine = headers.join("\t");

    // Générer les lignes de données au format Sage 50
    const dataLines: string[] = [];

    for (const [peseeId, data] of this.dataMap) {
      // Générer une ligne d'en-tête (E) pour chaque pesée
      const enTeteLine = this.generateEnTeteLine(data);
      dataLines.push(enTeteLine);

      // Générer une ligne de détail (L) pour chaque pesée
      const detailLine = this.generateDetailLine(data);
      dataLines.push(detailLine);
    }

    return [headerLine, ...dataLines].join("\n");
  }

  private generateEnTeteLine(data: ExportData): string {
    const values: string[] = ["E"]; // Préfixe "E" obligatoire pour Sage 50

    for (const column of this.template.sageColumns) {
      const mapping = this.template.mappings.find(
        (m) => m.sageColumn === column.name
      );

      if (!mapping || !mapping.isConfigured) {
        // Si pas de mapping configuré, mettre une valeur vide
        values.push("");
        continue;
      }

      const value = this.getValueFromMapping(data, mapping);
      values.push(this.transformValue(value, mapping.transformation));
    }

    return values.join("\t");
  }

  private generateDetailLine(data: ExportData): string {
    const values: string[] = ["L"]; // Préfixe "L" obligatoire pour Sage 50

    for (const column of this.template.sageColumns) {
      const mapping = this.template.mappings.find(
        (m) => m.sageColumn === column.name
      );

      if (!mapping || !mapping.isConfigured) {
        // Si pas de mapping configuré, mettre une valeur vide
        values.push("");
        continue;
      }

      // Pour les lignes de détail, on utilise principalement les données de pesée/produit
      let value = "";
      if (mapping.dataSource === "pesee" || mapping.dataSource === "product") {
        value = this.getValueFromMapping(data, mapping);
      }

      values.push(this.transformValue(value, mapping.transformation));
    }

    return values.join("\t");
  }

  private getValueFromMapping(
    data: ExportData,
    mapping: ColumnMapping
  ): string {
    const { dataSource, dataField, defaultValue } = mapping;

    try {
      switch (dataSource) {
        case "vide":
          return ""; // Colonne vide - toujours retourner une chaîne vide

        case "pesee":
          return (
            this.getPeseeValue(data.pesee, dataField) || defaultValue || ""
          );

        case "client":
          return (
            this.getClientValue(data.client, dataField) || defaultValue || ""
          );

        case "product":
          return (
            this.getProductValue(data.product, dataField) || defaultValue || ""
          );

        case "transporteur":
          return (
            this.getTransporteurValue(data.transporteur, dataField) ||
            defaultValue ||
            ""
          );

        case "userSettings":
          return (
            this.getUserSettingsValue(data.userSettings, dataField) ||
            defaultValue ||
            ""
          );

        case "static":
          return this.getStaticValue(dataField) || defaultValue || "";

        default:
          return defaultValue || "";
      }
    } catch (error) {
      console.warn(
        `Erreur lors de la récupération de la valeur pour ${dataField}:`,
        error
      );
      return defaultValue || "";
    }
  }

  private getPeseeValue(pesee: Pesee, field: string): string {
    switch (field) {
      case "numeroBon":
        return pesee.numeroBon;
      case "dateHeure":
        return new Date(pesee.dateHeure).toLocaleDateString("fr-FR");
      case "plaque":
        return pesee.plaque;
      case "nomEntreprise":
        return pesee.nomEntreprise;
      case "chantier":
        return pesee.chantier || "";
      case "poidsEntree":
        return pesee.poidsEntree?.toString() || "";
      case "poidsSortie":
        return pesee.poidsSortie?.toString() || "";
      case "net":
        return pesee.net?.toString() || "";
      case "prixHT":
        return pesee.prixHT?.toString() || "";
      case "prixTTC":
        return pesee.prixTTC?.toString() || "";
      case "moyenPaiement":
        return pesee.moyenPaiement || "";
      case "typeClient":
        return pesee.typeClient;
      default:
        return "";
    }
  }

  private getClientValue(client: Client | undefined, field: string): string {
    if (!client) return "";

    switch (field) {
      case "raisonSociale":
        return client.raisonSociale;
      case "prenom":
        return client.prenom || "";
      case "nom":
        return client.nom || "";
      case "siret":
        return client.siret || "";
      case "codeNAF":
        return client.codeNAF || "";
      case "activite":
        return client.activite || "";
      case "adresse":
        return client.adresse || "";
      case "codePostal":
        return client.codePostal || "";
      case "ville":
        return client.ville || "";
      case "representantLegal":
        return client.representantLegal || "";
      case "telephone":
        return client.telephone || "";
      case "email":
        return client.email || "";
      case "typeClient":
        return client.typeClient;
      default:
        return "";
    }
  }

  private getProductValue(product: Product | undefined, field: string): string {
    if (!product) return "";

    switch (field) {
      case "nom":
        return product.nom;
      case "description":
        return product.description || "";
      case "codeProduct":
        return product.codeProduct || "";
      case "prixHT":
        return product.prixHT?.toString() || "";
      case "prixTTC":
        return product.prixTTC?.toString() || "";
      case "unite":
        return product.unite || "";
      case "tva":
        return product.tva?.toString() || "";
      case "tauxTVA":
        return product.tauxTVA?.toString() || "";
      case "categorieDechet":
        return product.categorieDechet || "";
      case "codeDechets":
        return product.codeDechets || "";
      default:
        return "";
    }
  }

  private getTransporteurValue(
    transporteur: Transporteur | undefined,
    field: string
  ): string {
    if (!transporteur) return "";

    switch (field) {
      case "prenom":
        return transporteur.prenom;
      case "nom":
        return transporteur.nom;
      case "siret":
        return transporteur.siret || "";
      case "adresse":
        return transporteur.adresse || "";
      case "codePostal":
        return transporteur.codePostal || "";
      case "ville":
        return transporteur.ville || "";
      case "telephone":
        return transporteur.telephone || "";
      case "email":
        return transporteur.email || "";
      default:
        return "";
    }
  }

  private getUserSettingsValue(
    userSettings: UserSettings | undefined,
    field: string
  ): string {
    if (!userSettings) return "";

    switch (field) {
      case "nomEntreprise":
        return userSettings.nomEntreprise || "";
      case "adresse":
        return userSettings.adresse || "";
      case "codePostal":
        return userSettings.codePostal || "";
      case "ville":
        return userSettings.ville || "";
      case "email":
        return userSettings.email || "";
      case "telephone":
        return userSettings.telephone || "";
      case "siret":
        return userSettings.siret || "";
      case "codeAPE":
        return userSettings.codeAPE || "";
      case "codeNAF":
        return ""; // Maintenant dans GlobalSettings
      case "numeroRecepisse":
        return ""; // Maintenant dans GlobalSettings
      case "dateValiditeRecepisse":
        return ""; // Maintenant dans GlobalSettings
      case "numeroAutorisation":
        return ""; // Maintenant dans GlobalSettings
      case "representantLegal":
        return userSettings.representantLegal || "";
      default:
        return "";
    }
  }

  private getStaticValue(field: string): string {
    const now = new Date();

    switch (field) {
      case "currentDate":
        return now.toLocaleDateString("fr-FR");
      case "currentTime":
        return now.toLocaleTimeString("fr-FR");
      case "companyName":
        return "Votre Société"; // À récupérer des userSettings
      case "invoiceNumber":
        return `F${now.getFullYear()}${(now.getMonth() + 1)
          .toString()
          .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}`;
      case "deliveryNote":
        return "Bon de livraison";
      default:
        return "";
    }
  }

  private transformValue(value: string, transformation?: string): string {
    if (!transformation || transformation === "none") {
      return value;
    }

    switch (transformation) {
      case "formatDate":
        try {
          return new Date(value).toLocaleDateString("fr-FR");
        } catch {
          return value;
        }

      case "formatDateTime":
        try {
          return new Date(value).toLocaleString("fr-FR");
        } catch {
          return value;
        }

      case "uppercase":
        return value.toUpperCase();

      case "lowercase":
        return value.toLowerCase();

      case "trim":
        return value.trim();

      case "round":
        const num = parseFloat(value);
        return isNaN(num) ? value : Math.round(num).toString();

      case "formatCurrency":
        const currency = parseFloat(value);
        return isNaN(currency) ? value : `${currency.toFixed(2)} €`;

      default:
        return value;
    }
  }
}

export async function exportWithSageTemplate(
  template: SageTemplate,
  pesees: Pesee[]
): Promise<string> {
  const exporter = new SageTemplateExporter(template);
  await exporter.loadData(pesees);
  return exporter.generateExport();
}
