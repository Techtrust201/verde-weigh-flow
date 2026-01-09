import { db, Client } from "@/lib/database";

export interface DuplicateInfo {
  name: string;
  keptClient: Client;
  removedClients: Client[];
  peseesTransferred: number;
}

export interface DuplicateCleanupResult {
  totalClients: number;
  duplicatesFound: number;
  duplicatesRemoved: number;
  keptClients: Client[];
  removedClients: Client[];
  duplicateInfos: DuplicateInfo[];
  peseesTransferred: number;
}

export const cleanupDuplicateClients =
  async (): Promise<DuplicateCleanupResult> => {
    try {
      // Vérification rapide avant nettoyage complet
      // Si moins de 2 clients, pas de doublons possibles
      const quickCheck = await db.clients.count();
      if (quickCheck < 2) {
        return {
          totalClients: quickCheck,
          duplicatesFound: 0,
          duplicatesRemoved: 0,
          keptClients: [],
          removedClients: [],
          duplicateInfos: [],
          peseesTransferred: 0,
        };
      }

      const allClients = await db.clients.toArray();
      const totalClients = allClients.length;

      // Normaliser le nom pour la comparaison (insensible à la casse, sans espaces superflus)
      const normalizeName = (name: string): string => {
        return name.trim().toLowerCase();
      };

      // Grouper les clients par nom normalisé
      const clientsByNormalizedName = new Map<string, Client[]>();

      for (const client of allClients) {
        if (!client.raisonSociale) {
          continue;
        }
        const normalizedName = normalizeName(client.raisonSociale);

        if (!clientsByNormalizedName.has(normalizedName)) {
          clientsByNormalizedName.set(normalizedName, []);
        }
        clientsByNormalizedName.get(normalizedName)!.push(client);
      }

      // Identifier les doublons et déterminer lesquels garder/supprimer
      const keptClients: Client[] = [];
      const removedClients: Client[] = [];
      const duplicateInfos: DuplicateInfo[] = [];
      let duplicatesFound = 0;
      let totalPeseesTransferred = 0;

      // Préparer les mappings de transfert de pesées (clientId supprimé -> clientId conservé)
      const peseeTransfers = new Map<number, number>(); // Map<clientIdToRemove, clientIdToKeep>

      for (const [
        normalizedName,
        clients,
      ] of clientsByNormalizedName.entries()) {
        if (clients.length > 1) {
          // Vérifier si ce sont vraiment des doublons avec multi-critères
          // Si deux clients ont le même nom mais des codeClient ou siret différents,
          // ce ne sont PAS des doublons
          const realDuplicates: Client[][] = [];
          const processed = new Set<number>();

          for (let i = 0; i < clients.length; i++) {
            if (processed.has(clients[i].id!)) continue;

            const group = [clients[i]];
            processed.add(clients[i].id!);

            for (let j = i + 1; j < clients.length; j++) {
              if (processed.has(clients[j].id!)) continue;

              // Vérifier si ce sont vraiment des doublons
              const isDuplicate =
                // Même codeClient (le plus fiable)
                (clients[i].codeClient &&
                  clients[j].codeClient &&
                  clients[i].codeClient === clients[j].codeClient) ||
                // Même SIRET (très fiable)
                (clients[i].siret &&
                  clients[j].siret &&
                  clients[i].siret === clients[j].siret) ||
                // Même nom ET aucun codeClient/SIRET (moins fiable mais acceptable)
                (!clients[i].codeClient &&
                  !clients[j].codeClient &&
                  !clients[i].siret &&
                  !clients[j].siret);

              if (isDuplicate) {
                group.push(clients[j]);
                processed.add(clients[j].id!);
              }
            }

            if (group.length > 1) {
              realDuplicates.push(group);
            } else {
              // Client unique dans ce groupe de noms similaires
              keptClients.push(clients[i]);
            }
          }

          // Traiter seulement les vrais doublons
          for (const group of realDuplicates) {
            duplicatesFound += group.length - 1;

            // Trier par updatedAt décroissant (le plus récent en premier)
            const sortedClients = [...group].sort((a, b) => {
              const dateA =
                a.updatedAt?.getTime() || a.createdAt?.getTime() || 0;
              const dateB =
                b.updatedAt?.getTime() || b.createdAt?.getTime() || 0;
              return dateB - dateA;
            });

            const keptClient = sortedClients[0];
            const toRemove = sortedClients.slice(1);

            // Vérifier que le client conservé a un ID valide
            if (!keptClient.id) {
              console.warn(
                `Client conservé sans ID: ${keptClient.raisonSociale}`
              );
              continue;
            }

            keptClients.push(keptClient);
            removedClients.push(...toRemove);

            // Préparer les transferts de pesées
            for (const clientToRemove of toRemove) {
              if (clientToRemove.id) {
                peseeTransfers.set(clientToRemove.id, keptClient.id);
              }
            }

            duplicateInfos.push({
              name: keptClient.raisonSociale,
              keptClient,
              removedClients: toRemove,
              peseesTransferred: 0, // Sera calculé après le transfert
            });
          }
        } else {
          keptClients.push(clients[0]);
        }
      }

      // Utiliser une transaction Dexie pour garantir l'atomicité de l'opération
      // Si une erreur survient, toutes les modifications sont annulées
      await db
        .transaction("rw", db.clients, db.pesees, async () => {
          // ÉTAPE 1 : Vérifier que tous les clients conservés existent toujours
          for (const keptClient of keptClients) {
            if (keptClient.id) {
              const exists = await db.clients.get(keptClient.id);
              if (!exists) {
                throw new Error(
                  `Le client conservé "${keptClient.raisonSociale}" (ID: ${keptClient.id}) n'existe plus dans la base de données`
                );
              }
            }
          }

          // ÉTAPE 2 : Fusionner les données des clients supprimés vers les clients conservés
          // Cette étape est critique : fusionner plaques, chantiers, tarifs avant suppression
          for (const info of duplicateInfos) {
            const keptClient = info.keptClient;
            if (!keptClient.id) continue;

            // Récupérer le client complet depuis la DB pour avoir les données à jour
            const keptClientFull = await db.clients.get(keptClient.id);
            if (!keptClientFull) continue;

            // Préparer les données fusionnées
            const mergedPlaques = new Set<string>(keptClientFull.plaques || []);
            const mergedChantiers = new Set<string>(
              keptClientFull.chantiers || []
            );
            const mergedTarifs: Record<
              number,
              { prixHT?: number; prixTTC?: number }
            > = {
              ...(keptClientFull.tarifsPreferentiels || {}),
            };

            // Fusionner les données de chaque client supprimé
            for (const removedClient of info.removedClients) {
              // Fusionner les plaques
              if (removedClient.plaques && removedClient.plaques.length > 0) {
                removedClient.plaques.forEach((plaque) => {
                  if (plaque && plaque.trim()) {
                    mergedPlaques.add(plaque.trim());
                  }
                });
              }

              // Fusionner les chantiers
              if (
                removedClient.chantiers &&
                removedClient.chantiers.length > 0
              ) {
                removedClient.chantiers.forEach((chantier) => {
                  if (chantier && chantier.trim()) {
                    mergedChantiers.add(chantier.trim());
                  }
                });
              }

              // Fusionner les tarifs préférentiels (garder les valeurs les plus récentes)
              if (removedClient.tarifsPreferentiels) {
                Object.entries(removedClient.tarifsPreferentiels).forEach(
                  ([productId, tarif]) => {
                    const pid = parseInt(productId);
                    if (
                      !mergedTarifs[pid] ||
                      !keptClientFull.tarifsPreferentiels?.[pid]
                    ) {
                      // Si le client conservé n'a pas de tarif pour ce produit, prendre celui du supprimé
                      mergedTarifs[pid] = tarif;
                    }
                  }
                );
              }
            }

            // Préparer les mises à jour pour les autres champs
            const updates: Partial<Client> = {
              plaques: Array.from(mergedPlaques),
              chantiers: Array.from(mergedChantiers),
              tarifsPreferentiels: mergedTarifs,
              updatedAt: new Date(),
            };

            // Copier d'autres champs si le client conservé ne les a pas
            // Ou garder les valeurs les plus complètes/récentes
            for (const removedClient of info.removedClients) {
              // Champs métier : garder si absent dans le client conservé
              if (!keptClientFull.codeNAF && removedClient.codeNAF) {
                updates.codeNAF = removedClient.codeNAF;
              }
              if (!keptClientFull.activite && removedClient.activite) {
                updates.activite = removedClient.activite;
              }
              if (
                !keptClientFull.representantLegal &&
                removedClient.representantLegal
              ) {
                updates.representantLegal = removedClient.representantLegal;
              }

              // Coordonnées : garder les plus complètes
              if (
                !keptClientFull.email &&
                removedClient.email &&
                removedClient.email.trim()
              ) {
                updates.email = removedClient.email;
              } else if (
                keptClientFull.email &&
                removedClient.email &&
                removedClient.email.trim().length > keptClientFull.email.length
              ) {
                updates.email = removedClient.email;
              }

              if (
                !keptClientFull.telephone &&
                removedClient.telephone &&
                removedClient.telephone.trim()
              ) {
                updates.telephone = removedClient.telephone;
              } else if (
                keptClientFull.telephone &&
                removedClient.telephone &&
                removedClient.telephone.trim().length >
                  keptClientFull.telephone.length
              ) {
                updates.telephone = removedClient.telephone;
              }

              if (
                !keptClientFull.adresse &&
                removedClient.adresse &&
                removedClient.adresse.trim()
              ) {
                updates.adresse = removedClient.adresse;
              } else if (
                keptClientFull.adresse &&
                removedClient.adresse &&
                removedClient.adresse.trim().length >
                  keptClientFull.adresse.length
              ) {
                updates.adresse = removedClient.adresse;
              }

              if (
                !keptClientFull.codePostal &&
                removedClient.codePostal &&
                removedClient.codePostal.trim()
              ) {
                updates.codePostal = removedClient.codePostal;
              }

              if (
                !keptClientFull.ville &&
                removedClient.ville &&
                removedClient.ville.trim()
              ) {
                updates.ville = removedClient.ville;
              }

              // Champs Sage : garder ceux du plus récent (déjà trié par updatedAt)
              if (
                !keptClientFull.tvaIntracom &&
                removedClient.tvaIntracom &&
                removedClient.tvaIntracom.trim()
              ) {
                updates.tvaIntracom = removedClient.tvaIntracom;
              }

              if (
                !keptClientFull.nomBanque &&
                removedClient.nomBanque &&
                removedClient.nomBanque.trim()
              ) {
                updates.nomBanque = removedClient.nomBanque;
              }

              if (
                !keptClientFull.codeBanque &&
                removedClient.codeBanque &&
                removedClient.codeBanque.trim()
              ) {
                updates.codeBanque = removedClient.codeBanque;
              }

              if (
                !keptClientFull.codeGuichet &&
                removedClient.codeGuichet &&
                removedClient.codeGuichet.trim()
              ) {
                updates.codeGuichet = removedClient.codeGuichet;
              }

              if (
                !keptClientFull.numeroCompte &&
                removedClient.numeroCompte &&
                removedClient.numeroCompte.trim()
              ) {
                updates.numeroCompte = removedClient.numeroCompte;
              }
            }

            // Transporteur et mode de paiement : garder celui du plus récent
            // (le premier dans sortedClients est le plus récent)
            const mostRecentClient = info.removedClients[0];
            if (
              !keptClientFull.transporteurId &&
              mostRecentClient.transporteurId
            ) {
              updates.transporteurId = mostRecentClient.transporteurId;
            } else if (
              keptClientFull.transporteurId === 0 &&
              mostRecentClient.transporteurId &&
              mostRecentClient.transporteurId !== 0
            ) {
              updates.transporteurId = mostRecentClient.transporteurId;
            }

            if (
              !keptClientFull.modePaiementPreferentiel &&
              mostRecentClient.modePaiementPreferentiel
            ) {
              updates.modePaiementPreferentiel =
                mostRecentClient.modePaiementPreferentiel;
            }

            // Mettre à jour le client conservé avec les données fusionnées
            // Utiliser put() avec merge explicite pour garantir la préservation de tous les champs
            const mergedClient = {
              ...keptClientFull, // Toutes les données existantes (tous les champs du client)
              ...updates, // Les données fusionnées (plaques, chantiers, tarifs, etc.)
              id: keptClient.id,
              updatedAt: new Date(),
            } as Client;
            await db.clients.put(mergedClient);
          }

          // ÉTAPE 3 : Transférer toutes les pesées AVANT de supprimer les clients
          // Cette étape est critique : si elle échoue, on ne supprime rien
          for (const [
            clientIdToRemove,
            clientIdToKeep,
          ] of peseeTransfers.entries()) {
            // Vérifier que le client de destination existe
            const keptClientExists = await db.clients.get(clientIdToKeep);
            if (!keptClientExists) {
              throw new Error(
                `Impossible de transférer les pesées : le client de destination (ID: ${clientIdToKeep}) n'existe pas`
              );
            }

            // Récupérer toutes les pesées associées à ce client AVANT le transfert
            const pesees = await db.pesees
              .filter((p) => p.clientId === clientIdToRemove)
              .toArray();

            // Mettre à jour le compteur dans duplicateInfos AVANT le transfert
            for (const info of duplicateInfos) {
              for (const removedClient of info.removedClients) {
                if (removedClient.id === clientIdToRemove) {
                  info.peseesTransferred += pesees.length;
                }
              }
            }

            // Transférer chaque pesée vers le client conservé
            for (const pesee of pesees) {
              if (pesee.id) {
                await db.pesees.update(pesee.id, {
                  clientId: clientIdToKeep,
                  updatedAt: new Date(),
                });
                totalPeseesTransferred++;
              }
            }
          }

          // ÉTAPE 4 : Vérifier une dernière fois qu'aucune pesée n'est encore liée aux clients à supprimer
          // (sécurité supplémentaire)
          const idsToDelete = removedClients
            .map((client) => client.id)
            .filter((id): id is number => id !== undefined);

          for (const clientId of idsToDelete) {
            const remainingPesees = await db.pesees
              .filter((p) => p.clientId === clientId)
              .count();

            if (remainingPesees > 0) {
              throw new Error(
                `Sécurité : ${remainingPesees} pesée(s) encore associée(s) au client ID ${clientId}. Le transfert a peut-être échoué.`
              );
            }
          }

          // ÉTAPE 5 : Supprimer les clients seulement si tout s'est bien passé
          if (idsToDelete.length > 0) {
            await db.clients.bulkDelete(idsToDelete);
          }
        });

      return {
        totalClients,
        duplicatesFound,
        duplicatesRemoved: removedClients.length,
        keptClients,
        removedClients,
        duplicateInfos,
        peseesTransferred: totalPeseesTransferred,
      };
    } catch (error) {
      console.error("Erreur lors du nettoyage des doublons clients:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors du nettoyage des doublons";
      throw new Error(`Échec du nettoyage des doublons : ${errorMessage}`);
    }
  };
