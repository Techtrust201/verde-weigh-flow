import { db, Client, Product } from "@/lib/database";

export interface MissingFieldsClient {
  client: Client;
  suggestedRaisonSociale: string;
}

export interface MissingFieldsProduct {
  product: Product;
  suggestedCodeProduct: string;
}

export interface MissingFieldsResult {
  clients: MissingFieldsClient[];
  products: MissingFieldsProduct[];
}

/**
 * Détecte les entités sans champs obligatoires et propose des valeurs suggérées
 * Hypothèse B : Gérer les entités sans champs obligatoires avec une étape intermédiaire
 */
export async function validateAndFixMissingFields(): Promise<MissingFieldsResult> {
  const result: MissingFieldsResult = {
    clients: [],
    products: [],
  };

  // Détecter les clients sans raisonSociale
  const allClients = await db.clients.toArray();
  for (const client of allClients) {
    if (!client.raisonSociale || !client.raisonSociale.trim()) {
      // Générer une raison sociale suggérée depuis nom + prenom ou codeClient
      let suggestedRaisonSociale = "";
      if (client.nom || client.prenom) {
        suggestedRaisonSociale = [client.prenom, client.nom]
          .filter(Boolean)
          .join(" ");
      } else if (client.codeClient) {
        suggestedRaisonSociale = `Client ${client.codeClient}`;
      } else {
        suggestedRaisonSociale = `Client ${client.id || "inconnu"}`;
      }

      result.clients.push({
        client,
        suggestedRaisonSociale,
      });
    }
  }

  // Détecter les produits sans codeProduct
  const allProducts = await db.products.toArray();
  for (const product of allProducts) {
    if (!product.codeProduct || !product.codeProduct.trim()) {
      // Générer un code produit suggéré depuis le nom
      let suggestedCodeProduct = "";
      if (product.nom) {
        // Créer un code à partir du nom (premiers caractères, majuscules, sans espaces)
        suggestedCodeProduct = product.nom
          .substring(0, 10)
          .toUpperCase()
          .replace(/\s+/g, "")
          .replace(/[^A-Z0-9]/g, "");
        if (!suggestedCodeProduct) {
          suggestedCodeProduct = `PROD${product.id || "inconnu"}`;
        }
      } else {
        suggestedCodeProduct = `PROD${product.id || "inconnu"}`;
      }

      result.products.push({
        product,
        suggestedCodeProduct,
      });
    }
  }

  return result;
}



