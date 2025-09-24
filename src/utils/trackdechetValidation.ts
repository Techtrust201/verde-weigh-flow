import { Pesee, Product, Client, Transporteur, UserSettings } from "@/lib/database";
import { validateUserSettingsForTrackDechet, formatCompleteAddress } from "./trackdechetValidationHelpers";

/**
 * Valide si Track Déchet est applicable pour une pesée donnée
 */
export const isTrackDechetApplicable = (
  pesee: Pesee,
  client?: Client,
  transporteur?: Transporteur,
  product?: Product
): boolean => {
  // Track Déchet s'applique uniquement aux professionnels
  if (client?.typeClient === 'particulier') {
    return false;
  }

  // SIRET obligatoire pour producteur et transporteur
  if (!client?.siret || !transporteur?.siret) {
    return false;
  }

  // Catégorie déchet obligatoire
  if (!product?.categorieDechet) {
    return false;
  }

  return true;
};

/**
 * Valide les données minimales requises pour Track Déchet
 */
export const validateTrackDechetData = (
  pesee: Pesee,
  client?: Client,
  transporteur?: Transporteur,
  product?: Product,
  userSettings?: UserSettings
): { isValid: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];

  if (client?.typeClient === 'particulier') {
    return { 
      isValid: false, 
      missingFields: ['Client doit être professionnel pour Track Déchet'] 
    };
  }

  // Validation du client (producteur)
  if (!client?.siret) {
    missingFields.push('SIRET client');
  }

  if (!client?.adresse) {
    missingFields.push('Adresse client');
  }

  if (!client?.activite) {
    missingFields.push('Activité client');
  }

  // Validation du transporteur
  if (!transporteur?.siret) {
    missingFields.push('SIRET transporteur');
  }

  // Validation du produit
  if (!product?.categorieDechet) {
    missingFields.push('Catégorie déchet du produit');
  }

  // Validation des informations de l'entreprise (collecteur/destinataire)
  const userValidation = validateUserSettingsForTrackDechet(userSettings);
  if (!userValidation.isValid) {
    missingFields.push(...userValidation.missingFields);
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Formate les données de pesée pour l'API Track Déchet
 */
export const formatPeseeForTrackDechet = (
  pesee: Pesee,
  client: Client,
  transporteur: Transporteur,
  product: Product,
  codeDechet: string,
  userSettings: UserSettings
) => {
  return {
    // Informations générales du BSD
    type: "BSDD", // Bordereau de suivi de déchets dangereux/non dangereux
    
    // Producteur (client)
    emitter: {
      type: "PRODUCER",
      company: {
        name: client.raisonSociale,
        siret: client.siret,
        address: client.adresse,
        contact: client.representantLegal || "",
        phone: client.telephone || "",
        mail: client.email || ""
      }
    },
    
    // Destinataire/Collecteur (MON ENTREPRISE)
    recipient: {
      company: {
        name: userSettings.nomEntreprise,
        siret: userSettings.siret,
        address: formatCompleteAddress(userSettings),
        contact: userSettings.representantLegal || "",
        phone: userSettings.telephone,
        mail: userSettings.email
      },
      processingOperation: "R 13", // Opération de regroupement
      cap: userSettings.numeroAutorisation || "" // Numéro d'autorisation installation
    },
    
    // Transporteur
    transporter: {
      company: {
        name: `${transporteur.prenom} ${transporteur.nom}`,
        siret: transporteur.siret,
        address: transporteur.adresse || "",
        contact: `${transporteur.prenom} ${transporteur.nom}`,
        phone: transporteur.telephone || "",
        mail: transporteur.email || ""
      },
      receipt: userSettings.numeroRecepisse || "", // Récépissé transporteur
      validityLimit: userSettings.dateValiditeRecepisse || "", // Date de validité du récépissé
      numberPlate: transporteur.plaque || pesee.plaque
    },
    
    // Déchet
    waste: {
      code: codeDechet,
      name: product.nom,
      adr: "", // Code ADR si déchet dangereux
      quantity: pesee.net * 1000, // Conversion tonnes -> kg
      quantityType: "REAL", // Quantité réelle
      consistence: "SOLIDE", // État du déchet
      packagingInfos: [
        {
          type: "VRAC", // Type d'emballage
          quantity: 1
        }
      ]
    },
    
    // Informations de traçabilité
    wasteDetails: {
      quantity: pesee.net * 1000,
      quantityType: "REAL",
      onuCode: "", // Code ONU si applicable
      packagingInfos: [
        {
          type: "VRAC",
          quantity: 1
        }
      ]
    },
    
    // Métadonnées
    metadata: {
      source: "Application de pesée",
      numeroBon: pesee.numeroBon,
      dateHeure: pesee.dateHeure.toISOString(),
      chantier: pesee.chantier || ""
    }
  };
};