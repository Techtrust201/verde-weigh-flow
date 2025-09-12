import { useState, useEffect } from 'react';
import { db, Pesee, Product, Client, Transporteur, ExportLog } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

export interface ExportStats {
  totalPesees: number;
  newPesees: number;
  alreadyExported: number;
}

export const useExportData = () => {
  const [exportLogs, setExportLogs] = useState<ExportLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadExportLogs = async () => {
    try {
      const logs = await db.exportLogs.orderBy('createdAt').reverse().toArray();
      setExportLogs(logs);
    } catch (error) {
      console.error('Error loading export logs:', error);
    }
  };

  useEffect(() => {
    loadExportLogs();
  }, []);

  const getExportStats = async (startDate: Date, endDate: Date): Promise<ExportStats> => {
    try {
      const pesees = await db.pesees
        .filter(pesee => pesee.dateHeure >= startDate && pesee.dateHeure <= endDate)
        .toArray();

      const newPesees = pesees.filter(pesee => !pesee.exportedAt || pesee.exportedAt.length === 0);
      const alreadyExported = pesees.filter(pesee => pesee.exportedAt && pesee.exportedAt.length > 0);

      return {
        totalPesees: pesees.length,
        newPesees: newPesees.length,
        alreadyExported: alreadyExported.length
      };
    } catch (error) {
      console.error('Error getting export stats:', error);
      return { totalPesees: 0, newPesees: 0, alreadyExported: 0 };
    }
  };

  const generateEnrichedCSV = async (
    pesees: Pesee[], 
    exportType: 'new' | 'selective' | 'complete'
  ): Promise<string> => {
    // Charger toutes les données nécessaires
    const [products, clients, transporteurs] = await Promise.all([
      db.products.toArray(),
      db.clients.toArray(),
      db.transporteurs.toArray()
    ]);

    // Créer des maps pour un accès rapide
    const productMap = new Map(products.map(p => [p.id!, p]));
    const clientMap = new Map(clients.map(c => [c.id!, c]));
    const transporteurMap = new Map(transporteurs.map(t => [t.id!, t]));

    // Headers optimisés pour Sage 50
    const headers = [
      'Date',
      'Heure',
      'Numero_Bon',
      'Plaque',
      'Nom_Entreprise',
      'SIRET',
      'Adresse_Complete',
      'Email',
      'Telephone',
      'Chantier',
      'Code_Produit',
      'Nom_Produit',
      'Quantite_Tonnes',
      'Prix_Unitaire_HT',
      'Prix_Unitaire_TTC',
      'Total_HT',
      'Total_TTC',
      'Taux_TVA',
      'Moyen_Paiement',
      'Type_Client',
      'Transporteur',
      'SIRET_Transporteur',
      'Statut_Export'
    ];

    const csvRows = pesees.map(pesee => {
      const product = productMap.get(pesee.produitId);
      const client = pesee.clientId ? clientMap.get(pesee.clientId) : null;
      const transporteur = pesee.transporteurId ? transporteurMap.get(pesee.transporteurId) : null;

      // Calculs
      const prixUnitaireHT = product ? product.prixHT : (pesee.prixHT / pesee.net);
      const prixUnitaireTTC = product ? product.prixTTC : (pesee.prixTTC / pesee.net);
      const totalHT = pesee.net * prixUnitaireHT;
      const totalTTC = pesee.net * prixUnitaireTTC;
      const tauxTVA = product ? product.tauxTVA : 20;

      // Formatage des données
      const adresseComplete = client ? 
        `${client.adresse || ''} ${client.codePostal || ''} ${client.ville || ''}`.trim() : '';

      return [
        pesee.dateHeure.toLocaleDateString('fr-FR'),
        pesee.dateHeure.toLocaleTimeString('fr-FR'),
        pesee.numeroBon,
        pesee.plaque,
        pesee.nomEntreprise,
        client?.siret || '',
        adresseComplete,
        client?.email || '',
        client?.telephone || '',
        pesee.chantier || '',
        product?.codeProduct || '',
        product?.nom || '',
        pesee.net.toString().replace('.', ','), // Format français
        prixUnitaireHT.toFixed(2).replace('.', ','),
        prixUnitaireTTC.toFixed(2).replace('.', ','),
        totalHT.toFixed(2).replace('.', ','),
        totalTTC.toFixed(2).replace('.', ','),
        tauxTVA.toString(),
        pesee.moyenPaiement,
        pesee.typeClient,
        transporteur ? `${transporteur.prenom} ${transporteur.nom}` : pesee.transporteurLibre || '',
        transporteur?.siret || '',
        pesee.exportedAt && pesee.exportedAt.length > 0 ? 'Déjà exporté' : 'Nouveau'
      ].map(field => `"${field}"`); // Entourer chaque champ de guillemets
    });

    return [headers.join(';'), ...csvRows.map(row => row.join(';'))].join('\n');
  };

  const exportToCSV = async (
    startDate: Date,
    endDate: Date,
    exportType: 'new' | 'selective' | 'complete' = 'new'
  ): Promise<void> => {
    setIsLoading(true);
    try {
      // Récupérer les pesées selon le type d'export
      let query = db.pesees.filter(pesee => 
        pesee.dateHeure >= startDate && pesee.dateHeure <= endDate
      );

      const allPesees = await query.toArray();
      
      let peseesToExport: Pesee[];
      switch (exportType) {
        case 'new':
          peseesToExport = allPesees.filter(pesee => 
            !pesee.exportedAt || pesee.exportedAt.length === 0
          );
          break;
        case 'complete':
          peseesToExport = allPesees;
          break;
        case 'selective':
        default:
          peseesToExport = allPesees;
          break;
      }

      if (peseesToExport.length === 0) {
        toast({
          title: "Aucune donnée à exporter",
          description: "Aucune pesée trouvée pour la période sélectionnée.",
          variant: "destructive"
        });
        return;
      }

      // Générer le CSV enrichi
      const csvContent = await generateEnrichedCSV(peseesToExport, exportType);
      
      // Créer le nom de fichier
      const now = new Date();
      const fileName = `sage_export_${exportType}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}_${now.getTime()}.csv`;
      
      // Télécharger le fichier
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM pour Excel
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Générer le hash du fichier
      const fileHash = await generateFileHash(csvContent);

      // Enregistrer l'export log
      const exportLog: ExportLog = {
        fileName,
        startDate,
        endDate,
        totalRecords: peseesToExport.length,
        fileHash,
        fileContent: csvContent,
        exportType,
        peseeIds: peseesToExport.map(p => p.id!),
        createdAt: now
      };

      await db.exportLogs.add(exportLog);

      // Marquer les pesées comme exportées (uniquement pour 'new' et 'selective')
      if (exportType === 'new' || exportType === 'selective') {
        await Promise.all(
          peseesToExport.map(async (pesee) => {
            const currentExports = pesee.exportedAt || [];
            const updatedPesee = {
              ...pesee,
              exportedAt: [...currentExports, now],
              updatedAt: now
            };
            await db.pesees.update(pesee.id!, updatedPesee);
          })
        );
      }

      // Recharger les logs
      await loadExportLogs();

      toast({
        title: "Export réussi",
        description: `${peseesToExport.length} pesée(s) exportée(s) vers ${fileName}`
      });

    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const redownloadExport = async (exportLog: ExportLog): Promise<void> => {
    try {
      const blob = new Blob(['\ufeff' + exportLog.fileContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', exportLog.fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Re-téléchargement réussi",
        description: `Fichier ${exportLog.fileName} téléchargé`
      });
    } catch (error) {
      console.error('Error redownloading export:', error);
      toast({
        title: "Erreur de re-téléchargement",
        description: "Impossible de télécharger le fichier.",
        variant: "destructive"
      });
    }
  };

  const deleteExportLog = async (exportId: number): Promise<void> => {
    try {
      await db.exportLogs.delete(exportId);
      await loadExportLogs();
      
      toast({
        title: "Export supprimé",
        description: "L'historique d'export a été supprimé"
      });
    } catch (error) {
      console.error('Error deleting export log:', error);
      toast({
        title: "Erreur de suppression",
        description: "Impossible de supprimer l'export.",
        variant: "destructive"
      });
    }
  };

  return {
    exportLogs,
    isLoading,
    getExportStats,
    exportToCSV,
    redownloadExport,
    deleteExportLog,
    loadExportLogs
  };
};

// Utilitaire pour générer un hash du fichier
const generateFileHash = async (content: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};