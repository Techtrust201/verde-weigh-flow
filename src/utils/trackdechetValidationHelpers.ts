import { UserSettings } from "@/lib/database";

/**
 * Vérifie si les paramètres utilisateur sont suffisants pour Track Déchet
 */
export const validateUserSettingsForTrackDechet = (
  userSettings?: UserSettings
): { isValid: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];

  if (!userSettings) {
    return {
      isValid: false,
      missingFields: ['Paramètres utilisateur non configurés']
    };
  }

  // Champs obligatoires de base
  if (!userSettings.nomEntreprise?.trim()) {
    missingFields.push('Nom de l\'entreprise');
  }

  if (!userSettings.siret?.trim()) {
    missingFields.push('SIRET de l\'entreprise');
  }

  if (!userSettings.adresse?.trim()) {
    missingFields.push('Adresse de l\'entreprise');
  }

  if (!userSettings.codePostal?.trim()) {
    missingFields.push('Code postal de l\'entreprise');
  }

  if (!userSettings.ville?.trim()) {
    missingFields.push('Ville de l\'entreprise');
  }

  if (!userSettings.telephone?.trim()) {
    missingFields.push('Téléphone de l\'entreprise');
  }

  if (!userSettings.email?.trim()) {
    missingFields.push('Email de l\'entreprise');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Formate l'adresse complète pour Track Déchet
 */
export const formatCompleteAddress = (userSettings: UserSettings): string => {
  const parts = [
    userSettings.adresse?.trim(),
    userSettings.codePostal?.trim(),
    userSettings.ville?.trim()
  ].filter(Boolean);
  
  return parts.join(', ');
};

/**
 * Vérifie si les informations de transport sont configurées
 */
export const hasTransportConfiguration = (userSettings: UserSettings): boolean => {
  return !!(userSettings.numeroRecepisse?.trim() && userSettings.dateValiditeRecepisse?.trim());
};