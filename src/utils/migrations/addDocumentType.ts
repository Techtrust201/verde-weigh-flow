import { db } from "@/lib/database";

/**
 * Migration : Ajouter le champ typeDocument aux pesées existantes
 * Par défaut, les anciennes pesées sont considérées comme des bons de livraison
 */
export async function migrateExistingPesees() {
  try {
    const pesees = await db.pesees.toArray();

    for (const pesee of pesees) {
      // Si la pesée n'a pas de typeDocument, c'est une ancienne pesée
      if (!pesee.typeDocument) {
        // Par défaut, les anciennes pesées sont des bons de livraison
        await db.pesees.update(pesee.id!, {
          typeDocument: "bon_livraison",
          numeroFacture: undefined,
          numeroBonExported: pesee.synchronized || false,
          numeroFactureExported: false,
        });
      }
    }

    console.log(`✅ Migration terminée : ${pesees.length} pesées traitées`);
    return true;
  } catch (error) {
    console.error("❌ Erreur lors de la migration des pesées:", error);
    return false;
  }
}
