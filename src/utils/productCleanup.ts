import { db, Product } from "@/lib/database";

export interface DuplicateProductInfo {
  code: string;
  keptProduct: Product;
  removedProducts: Product[];
  peseesTransferred: number;
}

export interface DuplicateProductCleanupResult {
  totalProducts: number;
  duplicatesFound: number;
  duplicatesRemoved: number;
  keptProducts: Product[];
  removedProducts: Product[];
  duplicateInfos: DuplicateProductInfo[];
  peseesTransferred: number;
}

export const cleanupDuplicateProducts =
  async (): Promise<DuplicateProductCleanupResult> => {
    try {
      // Hypothèse D : Vérification rapide avant nettoyage complet
      // Si moins de 2 produits, pas de doublons possibles
      const quickCheck = await db.products.count();
      if (quickCheck < 2) {
        return {
          totalProducts: quickCheck,
          duplicatesFound: 0,
          duplicatesRemoved: 0,
          keptProducts: [],
          removedProducts: [],
          duplicateInfos: [],
          peseesTransferred: 0,
        };
      }

      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/25cea5cc-6f39-48d6-9ef1-0985c521626a",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "productCleanup.ts:21",
            message: "cleanupDuplicateProducts started",
            data: { timestamp: Date.now() },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "D",
          }),
        }
      ).catch(() => {});
      // #endregion
      const allProducts = await db.products.toArray();
      const totalProducts = allProducts.length;
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/25cea5cc-6f39-48d6-9ef1-0985c521626a",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "productCleanup.ts:24",
            message: "Total products loaded",
            data: {
              totalProducts,
              productsWithoutCode: allProducts.filter((p) => !p.codeProduct)
                .length,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "B",
          }),
        }
      ).catch(() => {});
      // #endregion

      // Normaliser le code produit pour la comparaison (insensible à la casse, sans espaces superflus)
      const normalizeCode = (code: string): string => {
        return code.trim().toLowerCase();
      };

      // Grouper les produits par code normalisé
      const productsByNormalizedCode = new Map<string, Product[]>();

      for (const product of allProducts) {
        if (!product.codeProduct) {
          // #region agent log
          fetch(
            "http://127.0.0.1:7242/ingest/25cea5cc-6f39-48d6-9ef1-0985c521626a",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                location: "productCleanup.ts:34",
                message: "Product skipped - no codeProduct",
                data: { productId: product.id, hasNom: !!product.nom },
                timestamp: Date.now(),
                sessionId: "debug-session",
                runId: "run1",
                hypothesisId: "B",
              }),
            }
          ).catch(() => {});
          // #endregion
          continue;
        }
        const normalizedCode = normalizeCode(product.codeProduct);
        // #region agent log
        fetch(
          "http://127.0.0.1:7242/ingest/25cea5cc-6f39-48d6-9ef1-0985c521626a",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "productCleanup.ts:36",
              message: "Normalizing product code",
              data: {
                original: product.codeProduct,
                normalized: normalizedCode,
                productId: product.id,
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "A",
            }),
          }
        ).catch(() => {});
        // #endregion

        if (!productsByNormalizedCode.has(normalizedCode)) {
          productsByNormalizedCode.set(normalizedCode, []);
        }
        productsByNormalizedCode.get(normalizedCode)!.push(product);
      }

      // Identifier les doublons et déterminer lesquels garder/supprimer
      const keptProducts: Product[] = [];
      const removedProducts: Product[] = [];
      const duplicateInfos: DuplicateProductInfo[] = [];
      let duplicatesFound = 0;
      let totalPeseesTransferred = 0;

      // Préparer les mappings de transfert de pesées (produitId supprimé -> produitId conservé)
      const peseeTransfers = new Map<number, number>(); // Map<productIdToRemove, productIdToKeep>

      for (const [
        normalizedCode,
        products,
      ] of productsByNormalizedCode.entries()) {
        if (products.length > 1) {
          // #region agent log
          fetch(
            "http://127.0.0.1:7242/ingest/25cea5cc-6f39-48d6-9ef1-0985c521626a",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                location: "productCleanup.ts:57",
                message: "Duplicate group found",
                data: {
                  normalizedCode,
                  count: products.length,
                  productIds: products.map((p) => p.id),
                  codeProducts: products.map((p) => p.codeProduct),
                },
                timestamp: Date.now(),
                sessionId: "debug-session",
                runId: "run1",
                hypothesisId: "A",
              }),
            }
          ).catch(() => {});
          // #endregion
          duplicatesFound += products.length - 1;

          // Trier par updatedAt décroissant (le plus récent en premier)
          const sortedProducts = [...products].sort((a, b) => {
            const dateA = a.updatedAt?.getTime() || a.createdAt?.getTime() || 0;
            const dateB = b.updatedAt?.getTime() || b.createdAt?.getTime() || 0;
            return dateB - dateA;
          });

          const keptProduct = sortedProducts[0];
          const toRemove = sortedProducts.slice(1);

          // Vérifier que le produit conservé a un ID valide
          if (!keptProduct.id) {
            console.warn(
              `Produit conservé sans ID: ${keptProduct.codeProduct}`
            );
            continue;
          }

          keptProducts.push(keptProduct);
          removedProducts.push(...toRemove);

          // Préparer les transferts de pesées
          for (const productToRemove of toRemove) {
            if (productToRemove.id) {
              peseeTransfers.set(productToRemove.id, keptProduct.id);
            }
          }

          duplicateInfos.push({
            code: keptProduct.codeProduct,
            keptProduct,
            removedProducts: toRemove,
            peseesTransferred: 0, // Sera calculé après le transfert
          });
        } else {
          keptProducts.push(products[0]);
        }
      }

      // Utiliser une transaction Dexie pour garantir l'atomicité de l'opération
      // Si une erreur survient, toutes les modifications sont annulées
      // #region agent log
      const transactionStartTime = Date.now();
      fetch(
        "http://127.0.0.1:7242/ingest/25cea5cc-6f39-48d6-9ef1-0985c521626a",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "productCleanup.ts:232",
            message: "Transaction started",
            data: {
              duplicatesToProcess: duplicateInfos.length,
              peseeTransfersCount: peseeTransfers.size,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "D",
          }),
        }
      ).catch(() => {});
      // #endregion
      await db
        .transaction("rw", db.products, db.pesees, async () => {
          // ÉTAPE 1 : Vérifier que tous les produits conservés existent toujours
          for (const keptProduct of keptProducts) {
            if (keptProduct.id) {
              const exists = await db.products.get(keptProduct.id);
              if (!exists) {
                throw new Error(
                  `Le produit conservé "${keptProduct.codeProduct}" (ID: ${keptProduct.id}) n'existe plus dans la base de données`
                );
              }
            }
          }

          // ÉTAPE 2 : Fusionner les données des produits supprimés vers les produits conservés
          // Cette étape est critique : fusionner isFavorite, description, champs Track Déchet avant suppression
          for (const info of duplicateInfos) {
            const keptProduct = info.keptProduct;
            if (!keptProduct.id) continue;

            // Récupérer le produit complet depuis la DB pour avoir les données à jour
            const keptProductFull = await db.products.get(keptProduct.id);
            if (!keptProductFull) continue;

            // Préparer les données fusionnées
            const updates: Partial<Product> = {
              updatedAt: new Date(),
            };

            // Fusionner isFavorite : garder true si au moins un produit l'a
            let mergedIsFavorite = keptProductFull.isFavorite;
            for (const removedProduct of info.removedProducts) {
              if (removedProduct.isFavorite) {
                mergedIsFavorite = true;
                break;
              }
            }
            updates.isFavorite = mergedIsFavorite;

            // Fusionner description : garder la plus complète (la plus longue)
            let mergedDescription = keptProductFull.description || "";
            for (const removedProduct of info.removedProducts) {
              if (
                removedProduct.description &&
                removedProduct.description.length > mergedDescription.length
              ) {
                mergedDescription = removedProduct.description;
              }
            }
            if (mergedDescription) {
              updates.description = mergedDescription;
            }

            // Fusionner tous les champs Track Déchet : garder les valeurs les plus complètes
            // Si le produit conservé n'a pas une valeur mais le supprimé l'a, prendre celle du supprimé
            if (!keptProductFull.categorieDechet) {
              for (const removedProduct of info.removedProducts) {
                if (removedProduct.categorieDechet) {
                  updates.categorieDechet = removedProduct.categorieDechet;
                  break;
                }
              }
            } else {
              updates.categorieDechet = keptProductFull.categorieDechet;
            }

            if (!keptProductFull.codeDechets) {
              for (const removedProduct of info.removedProducts) {
                if (removedProduct.codeDechets) {
                  updates.codeDechets = removedProduct.codeDechets;
                  break;
                }
              }
            } else {
              updates.codeDechets = keptProductFull.codeDechets;
            }

            if (
              keptProductFull.trackDechetEnabled === undefined ||
              !keptProductFull.trackDechetEnabled
            ) {
              for (const removedProduct of info.removedProducts) {
                if (removedProduct.trackDechetEnabled) {
                  updates.trackDechetEnabled =
                    removedProduct.trackDechetEnabled;
                  break;
                }
              }
            } else {
              updates.trackDechetEnabled = keptProductFull.trackDechetEnabled;
            }

            if (!keptProductFull.consistence) {
              for (const removedProduct of info.removedProducts) {
                if (removedProduct.consistence) {
                  updates.consistence = removedProduct.consistence;
                  break;
                }
              }
            } else {
              updates.consistence = keptProductFull.consistence;
            }

            if (
              keptProductFull.isSubjectToADR === undefined ||
              !keptProductFull.isSubjectToADR
            ) {
              for (const removedProduct of info.removedProducts) {
                if (removedProduct.isSubjectToADR) {
                  updates.isSubjectToADR = removedProduct.isSubjectToADR;
                  break;
                }
              }
            } else {
              updates.isSubjectToADR = keptProductFull.isSubjectToADR;
            }

            if (!keptProductFull.onuCode) {
              for (const removedProduct of info.removedProducts) {
                if (removedProduct.onuCode) {
                  updates.onuCode = removedProduct.onuCode;
                  break;
                }
              }
            } else {
              updates.onuCode = keptProductFull.onuCode;
            }

            if (!keptProductFull.cap) {
              for (const removedProduct of info.removedProducts) {
                if (removedProduct.cap) {
                  updates.cap = removedProduct.cap;
                  break;
                }
              }
            } else {
              updates.cap = keptProductFull.cap;
            }

            if (!keptProductFull.conditionnementType) {
              for (const removedProduct of info.removedProducts) {
                if (removedProduct.conditionnementType) {
                  updates.conditionnementType =
                    removedProduct.conditionnementType;
                  break;
                }
              }
            } else {
              updates.conditionnementType = keptProductFull.conditionnementType;
            }

            // Fusionner unite, prixHT, prixTTC : garder ceux du plus récent
            // (le premier dans sortedProducts est le plus récent)
            const mostRecentProduct = info.removedProducts[0];
            if (mostRecentProduct.unite && mostRecentProduct.unite.trim()) {
              updates.unite = mostRecentProduct.unite;
            } else {
              updates.unite = keptProductFull.unite;
            }

            if (
              mostRecentProduct.prixHT !== undefined &&
              mostRecentProduct.prixHT !== null
            ) {
              updates.prixHT = mostRecentProduct.prixHT;
            } else {
              updates.prixHT = keptProductFull.prixHT;
            }

            if (
              mostRecentProduct.prixTTC !== undefined &&
              mostRecentProduct.prixTTC !== null
            ) {
              updates.prixTTC = mostRecentProduct.prixTTC;
            } else {
              updates.prixTTC = keptProductFull.prixTTC;
            }

            // Mettre à jour le produit conservé avec les données fusionnées
            // Utiliser put() avec merge explicite pour garantir la préservation de tous les champs
            // Pattern cohérent avec ClientsSpace.tsx et PeseeSpace.tsx
            // #region agent log
            fetch(
              "http://127.0.0.1:7242/ingest/25cea5cc-6f39-48d6-9ef1-0985c521626a",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  location: "productCleanup.ts:220",
                  message: "Before db.put - checking preserved fields",
                  data: {
                    keptProductId: keptProduct.id,
                    updatesKeys: Object.keys(updates),
                    hasIsFavoriteBefore: keptProductFull.isFavorite,
                    hasDescriptionBefore: !!keptProductFull.description,
                  },
                  timestamp: Date.now(),
                  sessionId: "debug-session",
                  runId: "run1",
                  hypothesisId: "C",
                }),
              }
            ).catch(() => {});
            // #endregion
            const mergedProduct = {
              ...keptProductFull, // Toutes les données existantes (tous les champs du produit)
              ...updates, // Les données fusionnées (isFavorite, description, Track Déchet, etc.)
              id: keptProduct.id,
              updatedAt: new Date(),
            } as Product;
            await db.products.put(mergedProduct);
            // #region agent log
            const afterUpdate = await db.products.get(keptProduct.id);
            fetch(
              "http://127.0.0.1:7242/ingest/25cea5cc-6f39-48d6-9ef1-0985c521626a",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  location: "productCleanup.ts:222",
                  message: "After db.put - verifying preserved fields",
                  data: {
                    keptProductId: keptProduct.id,
                    hasIsFavoriteAfter: afterUpdate?.isFavorite,
                    hasDescriptionAfter: !!afterUpdate?.description,
                  },
                  timestamp: Date.now(),
                  sessionId: "debug-session",
                  runId: "run1",
                  hypothesisId: "C",
                }),
              }
            ).catch(() => {});
            // #endregion
          }

          // ÉTAPE 3 : Transférer toutes les pesées AVANT de supprimer les produits
          // Cette étape est critique : si elle échoue, on ne supprime rien
          for (const [
            productIdToRemove,
            productIdToKeep,
          ] of peseeTransfers.entries()) {
            // Vérifier que le produit de destination existe
            const keptProductExists = await db.products.get(productIdToKeep);
            if (!keptProductExists) {
              throw new Error(
                `Impossible de transférer les pesées : le produit de destination (ID: ${productIdToKeep}) n'existe pas`
              );
            }

            // Récupérer toutes les pesées associées à ce produit AVANT le transfert
            const pesees = await db.pesees
              .filter((p) => p.produitId === productIdToRemove)
              .toArray();

            // Mettre à jour le compteur dans duplicateInfos AVANT le transfert
            for (const info of duplicateInfos) {
              for (const removedProduct of info.removedProducts) {
                if (removedProduct.id === productIdToRemove) {
                  info.peseesTransferred += pesees.length;
                }
              }
            }

            // Transférer chaque pesée vers le produit conservé
            for (const pesee of pesees) {
              if (pesee.id) {
                await db.pesees.update(pesee.id, {
                  produitId: productIdToKeep,
                  updatedAt: new Date(),
                });
                totalPeseesTransferred++;
              }
            }
          }

          // ÉTAPE 4 : Vérifier une dernière fois qu'aucune pesée n'est encore liée aux produits à supprimer
          // (sécurité supplémentaire)
          const idsToDelete = removedProducts
            .map((product) => product.id)
            .filter((id): id is number => id !== undefined);

          for (const productId of idsToDelete) {
            const remainingPesees = await db.pesees
              .filter((p) => p.produitId === productId)
              .count();

            if (remainingPesees > 0) {
              throw new Error(
                `Sécurité : ${remainingPesees} pesée(s) encore associée(s) au produit ID ${productId}. Le transfert a peut-être échoué.`
              );
            }
          }

          // ÉTAPE 5 : Supprimer les produits seulement si tout s'est bien passé
          if (idsToDelete.length > 0) {
            await db.products.bulkDelete(idsToDelete);
          }
        })
        .catch((error) => {
          // #region agent log
          fetch(
            "http://127.0.0.1:7242/ingest/25cea5cc-6f39-48d6-9ef1-0985c521626a",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                location: "productCleanup.ts:315",
                message: "Transaction failed",
                data: { error: error.message, stack: error.stack },
                timestamp: Date.now(),
                sessionId: "debug-session",
                runId: "run1",
                hypothesisId: "C",
              }),
            }
          ).catch(() => {});
          // #endregion
          throw error;
        });
      // #region agent log
      const transactionDuration = Date.now() - transactionStartTime;
      fetch(
        "http://127.0.0.1:7242/ingest/25cea5cc-6f39-48d6-9ef1-0985c521626a",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "productCleanup.ts:317",
            message: "Transaction completed",
            data: {
              duration: transactionDuration,
              totalPeseesTransferred,
              duplicatesRemoved: removedProducts.length,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "D",
          }),
        }
      ).catch(() => {});
      // #endregion

      return {
        totalProducts,
        duplicatesFound,
        duplicatesRemoved: removedProducts.length,
        keptProducts,
        removedProducts,
        duplicateInfos,
        peseesTransferred: totalPeseesTransferred,
      };
    } catch (error) {
      // Hypothèse D : Gestion d'erreurs avec messages clairs
      console.error("Erreur lors du nettoyage des doublons produits:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors du nettoyage des doublons";
      throw new Error(`Échec du nettoyage des doublons : ${errorMessage}`);
    }
  };
