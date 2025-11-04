import { db } from "@/lib/database";

export const resetDatabaseWithTaxes = async () => {
  try {
    console.log("Réinitialisation de la base de données avec les taxes...");

    // Supprimer toutes les données existantes
    await db.products.clear();
    await db.taxes.clear();
    await db.clients.clear();
    await db.transporteurs.clear();
    await db.pesees.clear();

    console.log("Base de données vidée");

    // Créer des produits d'exemple (vide pour ne pas créer de produits par défaut)
    const sampleProducts: any[] = [];

    // Ne pas créer de produits par défaut
    // await db.products.bulkAdd(sampleProducts);
    console.log("Produits créés");

    // Créer des taxes d'exemple
    const sampleTaxes = [
      {
        nom: "Taxe de transport",
        taux: 2.5,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nom: "Frais de gestion",
        taux: 1.0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nom: "Taxe environnementale",
        taux: 0.5,
        active: false, // Désactivée par défaut
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await db.taxes.bulkAdd(sampleTaxes);
    console.log("Taxes créées");

    // Créer un client d'exemple
    const sampleClient = {
      typeClient: "professionnel" as const,
      raisonSociale: "Entreprise Test",
      siret: "12345678901234",
      codeNAF: "4673Z",
      activite: "Commerce de gros de matériaux de construction",
      representantLegal: "Jean Dupont",
      adresse: "123 Rue de la Paix",
      codePostal: "75001",
      ville: "Paris",
      email: "test@entreprise.com",
      telephone: "01 23 45 67 89",
      plaques: ["AB-123-CD"],
      chantiers: ["Chantier Test"],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.clients.add(sampleClient);
    console.log("Client créé");

    console.log(
      "✅ Base de données réinitialisée avec succès avec les taxes !"
    );

    // Afficher les taxes créées
    const taxes = await db.taxes.toArray();
    console.log("Taxes disponibles :", taxes);

    return true;
  } catch (error) {
    console.error("❌ Erreur lors de la réinitialisation :", error);
    return false;
  }
};

// Fonction pour tester le calcul des taxes
export const testTaxCalculation = async () => {
  try {
    console.log("🧪 Début du test de calcul des taxes...");

    const taxes = await db.taxes.toArray();
    const activeTaxes = taxes.filter((t) => t.active);

    console.log("Taxes actives :", activeTaxes);

    // Test de calcul
    const totalHT = 100; // 100€ HT
    const tauxTVA = 20; // 20% TVA

    const montantTVA = totalHT * (tauxTVA / 100);
    const taxesDetails = activeTaxes.map((tax) => ({
      nom: tax.nom,
      taux: tax.taux,
      montant: totalHT * (tax.taux / 100),
    }));

    const totalTaxes = taxesDetails.reduce((sum, tax) => sum + tax.montant, 0);
    const totalTTC = totalHT + montantTVA + totalTaxes;

    console.log("🧮 Test de calcul des taxes :");
    console.log(`- Total HT: ${totalHT}€`);
    console.log(`- TVA (${tauxTVA}%): ${montantTVA}€`);
    taxesDetails.forEach((tax) => {
      console.log(`- ${tax.nom} (${tax.taux}%): ${tax.montant}€`);
    });
    console.log(`- Total TTC: ${totalTTC}€`);
    console.log("✅ Test de calcul des taxes terminé avec succès");

    return true;
  } catch (error) {
    console.error("❌ Erreur lors du test :", error);
    return false;
  }
};
