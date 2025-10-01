import { useState, useEffect } from "react";
import { db, ExportLog, Pesee } from "@/lib/database";

export interface ExportStats {
  totalPesees: number;
  totalPoids: number;
  totalMontant: number;
  nombreClients: number;
}

export function useExportData() {
  const [exportLogs, setExportLogs] = useState<ExportLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadExportLogs();
  }, []);

  const loadExportLogs = async () => {
    try {
      setIsLoading(true);
      const logs = await db.exportLogs.orderBy("createdAt").reverse().toArray();
      setExportLogs(logs);
    } catch (error) {
      console.error("Erreur lors du chargement des logs d'export:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getExportStats = async (
    startDate: Date,
    endDate: Date,
    exportType: "new" | "selective" | "complete"
  ): Promise<ExportStats> => {
    try {
      let pesees: Pesee[];

      if (exportType === "complete") {
        // Toutes les pesées
        pesees = await db.pesees.toArray();
      } else {
        // Pesées dans la période
        pesees = await db.pesees
          .where("dateHeure")
          .between(startDate, endDate)
          .toArray();
      }

      const totalPesees = pesees.length;
      const totalPoids = pesees.reduce((sum, p) => sum + p.net, 0);
      const totalMontant = pesees.reduce((sum, p) => sum + p.prixTTC, 0);

      // Compter les clients uniques
      const clientIds = new Set(
        pesees.map((p) => p.clientId).filter((id) => id)
      );
      const nombreClients = clientIds.size;

      return {
        totalPesees,
        totalPoids,
        totalMontant,
        nombreClients,
      };
    } catch (error) {
      console.error("Erreur lors du calcul des statistiques:", error);
      return {
        totalPesees: 0,
        totalPoids: 0,
        totalMontant: 0,
        nombreClients: 0,
      };
    }
  };

  const exportToCSV = async (
    startDate: Date,
    endDate: Date,
    exportType: "new" | "selective" | "complete",
    selectedPesees?: Pesee[],
    format: "csv" | "excel" | "pdf" | "sage-articles" | "sage-template" = "csv",
    template?: any
  ) => {
    try {
      setIsLoading(true);

      let pesees: Pesee[];

      if (selectedPesees && selectedPesees.length > 0) {
        pesees = selectedPesees;
      } else if (exportType === "complete") {
        pesees = await db.pesees.toArray();
      } else {
        pesees = await db.pesees
          .where("dateHeure")
          .between(startDate, endDate)
          .toArray();
      }

      // Générer le contenu CSV
      let csvContent = "";

      if (format === "csv") {
        csvContent = generateCSVContent(pesees);
      } else if (format === "sage-template" && template) {
        csvContent = generateSageTemplateContent(pesees, template);
      } else {
        csvContent = generateCSVContent(pesees);
      }

      // Créer et télécharger le fichier
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      const fileName = `export_${exportType}_${
        new Date().toISOString().split("T")[0]
      }.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Enregistrer le log d'export
      await db.exportLogs.add({
        fileName,
        startDate,
        endDate,
        totalRecords: pesees.length,
        fileHash: await generateFileHash(csvContent),
        fileContent: csvContent,
        exportType,
        peseeIds: pesees.map((p) => p.id!),
        createdAt: new Date(),
      });

      // Recharger les logs
      await loadExportLogs();
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const redownloadExport = async (exportLog: ExportLog) => {
    try {
      const blob = new Blob([exportLog.fileContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", exportLog.fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erreur lors du re-téléchargement:", error);
      throw error;
    }
  };

  const deleteExportLog = async (id: number) => {
    try {
      await db.exportLogs.delete(id);
      await loadExportLogs();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      throw error;
    }
  };

  return {
    exportLogs,
    isLoading,
    getExportStats,
    exportToCSV,
    redownloadExport,
    deleteExportLog,
    loadExportLogs,
  };
}

// Fonctions utilitaires
function generateCSVContent(pesees: Pesee[]): string {
  const headers = [
    "ID",
    "Numéro Bon",
    "Date/Heure",
    "Plaque",
    "Nom Entreprise",
    "Chantier",
    "Produit",
    "Poids Entrée",
    "Poids Sortie",
    "Net",
    "Prix HT",
    "Prix TTC",
    "Moyen Paiement",
    "Type Client",
  ];

  const rows = pesees.map((pesee) => [
    pesee.id?.toString() || "",
    pesee.numeroBon,
    pesee.dateHeure.toISOString(),
    pesee.plaque,
    pesee.nomEntreprise,
    pesee.chantier || "",
    pesee.produitId?.toString() || "",
    pesee.poidsEntree?.toString() || "",
    pesee.poidsSortie?.toString() || "",
    pesee.net?.toString() || "",
    pesee.prixHT?.toString() || "",
    pesee.prixTTC?.toString() || "",
    pesee.moyenPaiement,
    pesee.typeClient,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((field) => `"${field}"`).join(","))
    .join("\n");
}

function generateSageTemplateContent(pesees: Pesee[], template: any): string {
  // Implémentation basique pour les templates Sage
  // À adapter selon les besoins spécifiques
  return generateCSVContent(pesees);
}

async function generateFileHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
