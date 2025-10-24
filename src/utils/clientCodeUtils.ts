/**
 * Utilitaires pour la normalisation et le matching des codes clients
 */

/**
 * Normalise un code client pour le matching
 * Exemples:
 * - "4" => "004"
 * - "10" => "010"
 * - "123" => "123"
 * - "004" => "004"
 * 
 * @param code Le code client à normaliser
 * @param length La longueur souhaitée (par défaut 3)
 * @returns Le code normalisé avec padding de zéros à gauche
 */
export function normalizeClientCode(code: string | undefined, length: number = 3): string {
  if (!code) return "";
  
  // Nettoyer le code (supprimer les espaces)
  const cleanCode = code.trim();
  
  // Si le code contient des caractères non numériques, le retourner tel quel
  if (!/^\d+$/.test(cleanCode)) {
    return cleanCode;
  }
  
  // Padding avec des zéros à gauche
  return cleanCode.padStart(length, "0");
}

/**
 * Compare deux codes clients en les normalisant d'abord
 * 
 * @param code1 Premier code client
 * @param code2 Deuxième code client
 * @returns true si les codes sont équivalents après normalisation
 */
export function matchClientCodes(code1: string | undefined, code2: string | undefined): boolean {
  if (!code1 || !code2) return false;
  
  const normalized1 = normalizeClientCode(code1);
  const normalized2 = normalizeClientCode(code2);
  
  return normalized1 === normalized2;
}

/**
 * Formate un code client pour l'affichage
 * Garde les zéros initiaux si présents
 * 
 * @param code Le code client à formater
 * @returns Le code formaté pour l'affichage
 */
export function formatClientCodeForDisplay(code: string | undefined): string {
  if (!code) return "";
  return code.trim();
}
