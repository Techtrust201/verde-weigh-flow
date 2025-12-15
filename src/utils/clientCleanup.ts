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
    const allClients = await db.clients.toArray();
    const totalClients = allClients.length;

    // Normaliser le nom pour la comparaison (insensible à la casse, sans espaces superflus)
    const normalizeName = (name: string): string => {
      return name.trim().toLowerCase();
    };

    // Grouper les clients par nom normalisé
    const clientsByNormalizedName = new Map<string, Client[]>();

    for (const client of allClients) {
      if (!client.raisonSociale) continue;
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

    for (const [normalizedName, clients] of clientsByNormalizedName.entries()) {
      if (clients.length > 1) {
        duplicatesFound += clients.length - 1;

        // Trier par updatedAt décroissant (le plus récent en premier)
        const sortedClients = [...clients].sort((a, b) => {
          const dateA = a.updatedAt?.getTime() || a.createdAt?.getTime() || 0;
          const dateB = b.updatedAt?.getTime() || b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });

        const keptClient = sortedClients[0];
        const toRemove = sortedClients.slice(1);

        // Vérifier que le client conservé a un ID valide
        if (!keptClient.id) {
          console.warn(`Client conservé sans ID: ${keptClient.raisonSociale}`);
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
      } else {
        keptClients.push(clients[0]);
      }
    }

    // Utiliser une transaction Dexie pour garantir l'atomicité de l'opération
    // Si une erreur survient, toutes les modifications sont annulées
    await db.transaction("rw", db.clients, db.pesees, async () => {
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

      // ÉTAPE 2 : Transférer toutes les pesées AVANT de supprimer les clients
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
  };
