import { useEffect, useRef, RefObject } from "react";

/**
 * Hook personnalisé pour scroller automatiquement vers le haut d'une liste
 * quand une valeur de recherche change.
 *
 * @param searchValue - La valeur de recherche qui déclenche le scroll
 * @returns Une référence à attacher au CommandList
 */
export function useScrollToTop(searchValue: string): RefObject<HTMLDivElement> {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current || !searchValue) return;

    // Utiliser requestAnimationFrame pour une meilleure performance
    // et s'assurer que le DOM est mis à jour avant le scroll
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = 0;
      }
    });
  }, [searchValue]);

  return listRef;
}
