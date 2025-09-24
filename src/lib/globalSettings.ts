/**
 * Gestion des paramètres globaux de l'application
 */

import { db, Config } from './database';

export interface GlobalSettings {
  // Track Déchet - Configuration globale
  trackDechetToken?: string;
  trackDechetEnabled?: boolean;
  trackDechetValidated?: boolean;
  trackDechetValidatedAt?: Date;
  trackDechetSandboxMode?: boolean;
  
  // Autres paramètres globaux futurs
  sageApiEnabled?: boolean;
  defaultTaxRate?: number;
  companyName?: string;
}

/**
 * Clés des paramètres globaux stockés en base
 */
const SETTINGS_KEYS = {
  TRACK_DECHET_TOKEN: 'trackDechetToken',
  TRACK_DECHET_ENABLED: 'trackDechetEnabled', 
  TRACK_DECHET_VALIDATED: 'trackDechetValidated',
  TRACK_DECHET_VALIDATED_AT: 'trackDechetValidatedAt',
  TRACK_DECHET_SANDBOX_MODE: 'trackDechetSandboxMode',
} as const;

/**
 * Récupère une valeur de paramètre global
 */
async function getSetting<T>(key: string): Promise<T | undefined> {
  try {
    const config = await db.config.where('key').equals(key).first();
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
    const existing = await db.config.where('key').equals(key).first();
    
    if (existing) {
      await db.config.update(existing.id!, {
        value,
        updatedAt: now
      });
    } else {
      await db.config.add({
        key,
        value,
        createdAt: now,
        updatedAt: now
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
      trackDechetEnabled,
      trackDechetValidated,
      trackDechetValidatedAt,
      trackDechetSandboxMode
    ] = await Promise.all([
      getSetting<string>(SETTINGS_KEYS.TRACK_DECHET_TOKEN),
      getSetting<boolean>(SETTINGS_KEYS.TRACK_DECHET_ENABLED),
      getSetting<boolean>(SETTINGS_KEYS.TRACK_DECHET_VALIDATED),
      getSetting<string>(SETTINGS_KEYS.TRACK_DECHET_VALIDATED_AT),
      getSetting<boolean>(SETTINGS_KEYS.TRACK_DECHET_SANDBOX_MODE)
    ]);

    return {
      trackDechetToken,
      trackDechetEnabled: trackDechetEnabled ?? false,
      trackDechetValidated: trackDechetValidated ?? false,
      trackDechetValidatedAt: trackDechetValidatedAt ? new Date(trackDechetValidatedAt) : undefined,
      trackDechetSandboxMode: trackDechetSandboxMode ?? false
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres globaux:', error);
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
}): Promise<void> {
  try {
    const updates: Promise<void>[] = [];

    if (settings.token !== undefined) {
      updates.push(setSetting(SETTINGS_KEYS.TRACK_DECHET_TOKEN, settings.token));
    }
    
    if (settings.enabled !== undefined) {
      updates.push(setSetting(SETTINGS_KEYS.TRACK_DECHET_ENABLED, settings.enabled));
    }
    
    if (settings.validated !== undefined) {
      updates.push(setSetting(SETTINGS_KEYS.TRACK_DECHET_VALIDATED, settings.validated));
    }
    
    if (settings.validatedAt !== undefined) {
      updates.push(setSetting(SETTINGS_KEYS.TRACK_DECHET_VALIDATED_AT, settings.validatedAt.toISOString()));
    }
    
    if (settings.sandboxMode !== undefined) {
      updates.push(setSetting(SETTINGS_KEYS.TRACK_DECHET_SANDBOX_MODE, settings.sandboxMode));
    }

    await Promise.all(updates);
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres Track Déchet:', error);
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
  return !!(settings.trackDechetEnabled && settings.trackDechetValidated && settings.trackDechetToken);
}