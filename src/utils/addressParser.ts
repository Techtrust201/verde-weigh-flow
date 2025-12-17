/**
 * Utilitaires pour parser et découper les adresses
 */

export interface ParsedAddress {
  numeroVoie?: string;
  voie?: string;
  complement?: string;
}

/**
 * Tente de découper une adresse en numéro de voie, voie et complément
 *
 * Patterns supportés :
 * - "123 rue de la Paix"
 * - "45 bis avenue des Champs-Élysées"
 * - "12-14 boulevard Saint-Michel"
 * - "Rue de la Paix" (sans numéro)
 * - "123 rue de la Paix, Appartement 4B"
 */
export function parseAddress(
  address: string | undefined | null
): ParsedAddress {
  if (!address || typeof address !== "string" || address.trim() === "") {
    return {};
  }

  const trimmed = address.trim();

  // Pattern pour détecter un numéro de voie au début (peut contenir bis, ter, etc.)
  // Exemples : "123", "45 bis", "12-14", "123A"
  const numeroPattern =
    /^(\d+[A-Za-z]?(\s*[-/]\s*\d+)?(\s+(bis|ter|quater))?)\s+/i;

  // Pattern pour détecter les types de voies courants
  const voiePattern =
    /^(rue|avenue|boulevard|chemin|impasse|place|allée|route|passage|cours|quai|square|villa|sentier|voie|rond[-\s]?point|carrefour|esplanade|promenade|faubourg|bd|av|r|pl|ch|imp|all|rt|pass|crs|qu|sq|vl|sent|voie|rte)\s+/i;

  // Pattern pour détecter un complément (après une virgule généralement)
  const complementPattern = /,\s*(.+)$/;

  let numeroVoie: string | undefined;
  let voie: string | undefined;
  let complement: string | undefined;
  let reste = trimmed;

  // Extraire le complément s'il existe
  const complementMatch = reste.match(complementPattern);
  if (complementMatch) {
    complement = complementMatch[1].trim();
    reste = reste.substring(0, complementMatch.index).trim();
  }

  // Extraire le numéro de voie
  const numeroMatch = reste.match(numeroPattern);
  if (numeroMatch) {
    numeroVoie = numeroMatch[1].trim();
    reste = reste.substring(numeroMatch[0].length).trim();
  }

  // Le reste devrait être la voie
  if (reste) {
    // Vérifier si le début correspond à un type de voie connu
    const voieMatch = reste.match(voiePattern);
    if (voieMatch) {
      voie = reste;
    } else {
      // Si pas de type de voie détecté mais qu'on a un numéro, tout le reste est la voie
      if (numeroVoie) {
        voie = reste;
      } else {
        // Sinon, c'est peut-être juste une voie sans numéro
        voie = reste;
      }
    }
  }

  return {
    numeroVoie: numeroVoie || undefined,
    voie: voie || undefined,
    complement: complement || undefined,
  };
}

/**
 * Extrait le numéro de voie d'une adresse
 */
export function extractNumeroVoie(
  address: string | undefined | null
): string | undefined {
  return parseAddress(address).numeroVoie;
}

/**
 * Extrait la voie d'une adresse (sans le numéro)
 */
export function extractVoie(
  address: string | undefined | null
): string | undefined {
  return parseAddress(address).voie;
}

/**
 * Extrait le complément d'adresse
 */
export function extractComplement(
  address: string | undefined | null
): string | undefined {
  return parseAddress(address).complement;
}
