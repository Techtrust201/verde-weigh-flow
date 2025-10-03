import {
  Pesee,
  Product,
  Client,
  Transporteur,
  UserSettings,
} from "@/lib/database";
import { validateUserSettingsForTrackDechet } from "./trackdechetValidationHelpers";
// Fonctions helpers locales
function formatCompleteAddress(
  address: string,
  postalCode: string,
  city: string
): string {
  return `${address}, ${postalCode} ${city}`;
}

/**
 * Formate un code déchet au format Track Déchet (XX XX XX ou XX XX XX*)
 */
function formatWasteCode(code: string): string {
  // Si le code contient déjà des espaces, le retourner tel quel
  if (code.includes(" ")) {
    return code;
  }

  // Si le code fait 6 chiffres, ajouter des espaces
  if (code.length === 6 && /^\d{6}$/.test(code)) {
    return `${code.slice(0, 2)} ${code.slice(2, 4)} ${code.slice(4, 6)}`;
  }

  // Si le code fait 6 chiffres + astérisque, ajouter des espaces et garder l'astérisque
  if (code.length === 7 && /^\d{6}\*$/.test(code)) {
    return `${code.slice(0, 2)} ${code.slice(2, 4)} ${code.slice(4, 6)}*`;
  }

  // Retourner le code tel quel si le format n'est pas reconnu
  return code;
}

/**
 * Valide si Track Déchet est applicable pour une pesée donnée
 */
export const isTrackDechetApplicable = (
  pesee: Pesee,
  client?: Client,
  transporteur?: Transporteur,
  product?: Product
): boolean => {
  // Track Déchet s'active uniquement si le produit est configuré pour être suivi
  if (!product?.trackDechetEnabled) {
    return false;
  }

  // Track Déchet s'applique uniquement aux professionnels
  if (client?.typeClient === "particulier") {
    return false;
  }

  // SIRET obligatoire pour producteur et transporteur
  // Si aucun transporteur n'est sélectionné, le client est son propre transporteur
  const transporteurSiret = transporteur?.siret || client?.siret;
  if (!client?.siret || !transporteurSiret) {
    return false;
  }

  // Catégorie déchet obligatoire
  if (!product?.categorieDechet) {
    return false;
  }

  // Code déchet obligatoire
  if (!product?.codeDechets) {
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

  // Vérifier d'abord si le produit a Track Déchet activé
  if (!product?.trackDechetEnabled) {
    return {
      isValid: false,
      missingFields: ["Le produit n'est pas configuré pour Track Déchet"],
    };
  }

  if (client?.typeClient === "particulier") {
    return {
      isValid: false,
      missingFields: ["Client doit être professionnel pour Track Déchet"],
    };
  }

  // Validation du client (producteur)
  if (!client?.siret) {
    missingFields.push("SIRET client");
  }

  if (!client?.adresse) {
    missingFields.push("Adresse client");
  }

  if (!client?.activite) {
    missingFields.push("Activité client");
  }

  // Validation du transporteur
  // Si aucun transporteur n'est sélectionné, le client est son propre transporteur
  const transporteurSiret = transporteur?.siret || client?.siret;
  if (!transporteurSiret) {
    missingFields.push(
      "SIRET transporteur (utilise le SIRET client par défaut)"
    );
  }

  // Validation du produit
  if (!product?.categorieDechet) {
    missingFields.push("Catégorie déchet du produit");
  }

  // Validation des informations de l'entreprise (collecteur/destinataire)
  const userValidation = validateUserSettingsForTrackDechet(userSettings);
  if (!userValidation.isValid) {
    missingFields.push(...userValidation.missingFields);
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Formate les données de pesée pour l'API Track Déchet
 */
export const formatPeseeForTrackDechet = (
  pesee: Pesee,
  client: Client,
  transporteur: Transporteur | null,
  product: Product,
  codeDechet: string,
  userSettings: UserSettings
) => {
  // Si aucun transporteur n'est sélectionné, utiliser les données du client comme transporteur
  const effectiveTransporteur = transporteur || {
    prenom: client.prenom || "",
    nom: client.nom || client.raisonSociale,
    siret: client.siret!,
    adresse: client.adresse || "",
    codePostal: client.codePostal || "",
    ville: client.ville || "",
    telephone: client.telephone || "",
    email: client.email || "",
    plaque: pesee.plaque,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return {
    // Structure minimale conforme à l'API Track Déchet
    emitter: {
      company: {
        siret: client.siret,
        name: client.raisonSociale,
        address: client.adresse,
        contact: client.representantLegal || "",
        phone: client.telephone || "",
        mail: client.email || "",
      },
      type: "PRODUCER", // Type d'émetteur obligatoire
    },

    recipient: {
      company: {
        siret: userSettings.siret,
        name: userSettings.nomEntreprise,
        address: formatCompleteAddress(
          userSettings.adresse,
          userSettings.codePostal,
          userSettings.ville
        ),
        contact: userSettings.representantLegal || "",
        phone: userSettings.telephone,
        mail: userSettings.email,
      },
      processingOperation: "R 13",
      ...(product.cap && { cap: product.cap }), // CAP si défini
    },

    transporter: {
      company: {
        siret: effectiveTransporteur.siret,
        name: `${effectiveTransporteur.prenom} ${effectiveTransporteur.nom}`,
        address: effectiveTransporteur.adresse || "",
        contact: `${effectiveTransporteur.prenom} ${effectiveTransporteur.nom}`,
        phone: effectiveTransporteur.telephone || "",
        mail: effectiveTransporteur.email || "",
      },
      validityLimit: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      numberPlate: effectiveTransporteur.plaque || pesee.plaque,
    },

    wasteDetails: {
      code: formatWasteCode(codeDechet),
      name: product.nom,
      quantity: pesee.net,
      quantityType: "REAL",
      consistence: product.consistence || "SOLID", // Consistance obligatoire
      isSubjectToADR: product.isSubjectToADR || false, // ADR obligatoire
      ...(product.isSubjectToADR &&
        product.onuCode && { onuCode: product.onuCode }), // Code ONU si ADR
      packagingInfos: [
        {
          type: product.conditionnementType || "BENNE",
          quantity: 1,
        },
      ],
    },
  };
};
