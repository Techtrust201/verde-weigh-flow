/**
 * Gestion des paramètres globaux de l'application
 */

import { db, Config } from "./database";

export interface GlobalSettings {
  // Track Déchet - Configuration globale
  trackDechetToken?: string;
  trackDechetValidated?: boolean;
  trackDechetValidatedAt?: Date;
  trackDechetSandboxMode?: boolean;

  // Paramètres Track Déchet déplacés de UserSettings
  codeNAF?: string; // Code NAF pour Track Déchet
  numeroRecepisse?: string; // Récépissé transporteur
  dateValiditeRecepisse?: string; // Date de validité du récépissé
  numeroAutorisation?: string; // Numéro d'autorisation installation

  // Autres paramètres globaux futurs
  sageApiEnabled?: boolean;
  defaultTaxRate?: number;
  companyName?: string;
}

/**
 * Clés des paramètres globaux stockés en base
 */
const SETTINGS_KEYS = {
  TRACK_DECHET_TOKEN: "trackDechetToken",
  TRACK_DECHET_VALIDATED: "trackDechetValidated",
  TRACK_DECHET_VALIDATED_AT: "trackDechetValidatedAt",
  TRACK_DECHET_SANDBOX_MODE: "trackDechetSandboxMode",

  // Nouveaux paramètres Track Déchet
  CODE_NAF: "codeNAF",
  NUMERO_RECEPISSE: "numeroRecepisse",
  DATE_VALIDITE_RECEPISSE: "dateValiditeRecepisse",
  NUMERO_AUTORISATION: "numeroAutorisation",
} as const;

/**
 * Récupère une valeur de paramètre global
 */
async function getSetting<T>(key: string): Promise<T | undefined> {
  try {
    const config = await db.config.where("key").equals(key).first();
    return config?.value as T;
  } catch (error) {
    console.error(`Erreur lors de la récupération du paramètre ${key}:`, error);
    return undefined;
  }
}

/**
 * Sauvegarde une valeur de paramètre global
 */
async function setSetting(key: string, value: any): Promise<void> {
  try {
    const now = new Date();
    const existing = await db.config.where("key").equals(key).first();

    if (existing) {
      await db.config.update(existing.id!, {
        value,
        updatedAt: now,
      });
    } else {
      await db.config.add({
        key,
        value,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (error) {
    console.error(`Erreur lors de la sauvegarde du paramètre ${key}:`, error);
    throw error;
  }
}

/**
 * Récupère tous les paramètres globaux
 */
export async function getGlobalSettings(): Promise<GlobalSettings> {
  try {
    const [
      trackDechetToken,
      trackDechetValidated,
      trackDechetValidatedAt,
      trackDechetSandboxMode,
      codeNAF,
      numeroRecepisse,
      dateValiditeRecepisse,
      numeroAutorisation,
    ] = await Promise.all([
      getSetting<string>(SETTINGS_KEYS.TRACK_DECHET_TOKEN),
      getSetting<boolean>(SETTINGS_KEYS.TRACK_DECHET_VALIDATED),
      getSetting<string>(SETTINGS_KEYS.TRACK_DECHET_VALIDATED_AT),
      getSetting<boolean>(SETTINGS_KEYS.TRACK_DECHET_SANDBOX_MODE),
      getSetting<string>(SETTINGS_KEYS.CODE_NAF),
      getSetting<string>(SETTINGS_KEYS.NUMERO_RECEPISSE),
      getSetting<string>(SETTINGS_KEYS.DATE_VALIDITE_RECEPISSE),
      getSetting<string>(SETTINGS_KEYS.NUMERO_AUTORISATION),
    ]);

    return {
      trackDechetToken,
      trackDechetValidated: trackDechetValidated ?? false,
      trackDechetValidatedAt: trackDechetValidatedAt
        ? new Date(trackDechetValidatedAt)
        : undefined,
      trackDechetSandboxMode: trackDechetSandboxMode ?? false,
      codeNAF,
      numeroRecepisse,
      dateValiditeRecepisse,
      numeroAutorisation,
    };
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des paramètres globaux:",
      error
    );
    return {};
  }
}

/**
 * Met à jour les paramètres Track Déchet
 */
export async function updateTrackDechetSettings(settings: {
  token?: string;
  enabled?: boolean;
  validated?: boolean;
  validatedAt?: Date;
  sandboxMode?: boolean;
  codeNAF?: string;
  numeroRecepisse?: string;
  dateValiditeRecepisse?: string;
  numeroAutorisation?: string;
}): Promise<void> {
  try {
    const updates: Promise<void>[] = [];

    if (settings.token !== undefined) {
      updates.push(
        setSetting(SETTINGS_KEYS.TRACK_DECHET_TOKEN, settings.token)
      );
    }

    if (settings.enabled !== undefined) {
      updates.push(
        setSetting(SETTINGS_KEYS.TRACK_DECHET_ENABLED, settings.enabled)
      );
    }

    if (settings.validated !== undefined) {
      updates.push(
        setSetting(SETTINGS_KEYS.TRACK_DECHET_VALIDATED, settings.validated)
      );
    }

    if (settings.validatedAt !== undefined) {
      updates.push(
        setSetting(
          SETTINGS_KEYS.TRACK_DECHET_VALIDATED_AT,
          settings.validatedAt.toISOString()
        )
      );
    }

    if (settings.sandboxMode !== undefined) {
      updates.push(
        setSetting(
          SETTINGS_KEYS.TRACK_DECHET_SANDBOX_MODE,
          settings.sandboxMode
        )
      );
    }

    // Nouveaux paramètres Track Déchet
    if (settings.codeNAF !== undefined) {
      updates.push(setSetting(SETTINGS_KEYS.CODE_NAF, settings.codeNAF));
    }

    if (settings.numeroRecepisse !== undefined) {
      updates.push(
        setSetting(SETTINGS_KEYS.NUMERO_RECEPISSE, settings.numeroRecepisse)
      );
    }

    if (settings.dateValiditeRecepisse !== undefined) {
      updates.push(
        setSetting(
          SETTINGS_KEYS.DATE_VALIDITE_RECEPISSE,
          settings.dateValiditeRecepisse
        )
      );
    }

    if (settings.numeroAutorisation !== undefined) {
      updates.push(
        setSetting(
          SETTINGS_KEYS.NUMERO_AUTORISATION,
          settings.numeroAutorisation
        )
      );
    }

    await Promise.all(updates);
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour des paramètres Track Déchet:",
      error
    );
    throw error;
  }
}

/**
 * Récupère le token Track Déchet global
 */
export async function getTrackDechetToken(): Promise<string | undefined> {
  return getSetting<string>(SETTINGS_KEYS.TRACK_DECHET_TOKEN);
}

/**
 * Vérifie si Track Déchet est activé et configuré
 */
export async function isTrackDechetReady(): Promise<boolean> {
  const settings = await getGlobalSettings();
  return !!(settings.trackDechetValidated && settings.trackDechetToken);
}
