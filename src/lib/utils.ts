import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formate un nombre (poids) avec exactement 3 décimales
 * Toujours 3 chiffres après la virgule (ex: "0.200" au lieu de "0.2")
 * @param value - La valeur numérique à formater
 * @returns La valeur formatée en string avec exactement 3 décimales (ex: "0.200")
 */
export function formatWeight(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.000";
  }

  // Formater avec exactement 3 décimales
  return value.toFixed(3);
}
