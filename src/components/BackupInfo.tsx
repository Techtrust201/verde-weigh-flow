import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Database,
  Clock,
  Download,
  HardDrive,
  Users,
  Package,
  Scale,
  Truck,
  FileText,
  Info,
} from "lucide-react";
import { fileBackup } from "@/services/fileBackup";
import { db } from "@/lib/database";

interface BackupInfo {
  lastBackup?: string;
  totalClients: number;
  totalProducts: number;
  totalPesees: number;
  totalTransporteurs: number;
  totalTemplates: number;
  estimatedSize: string;
}

export default function BackupInfo() {
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backupSettings, setBackupSettings] = useState({
    autoBackupEnabled: true,
    backupIntervalMinutes: 5,
    supabaseSyncEnabled: true,
  });

  const loadBackupSettings = () => {
    try {
      const savedSettings = localStorage.getItem("backupSettings");
      if (savedSettings) {
        setBackupSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres:", error);
    }
  };

  useEffect(() => {
    loadBackupInfo();
    loadBackupSettings();

    // Écouter les changements de paramètres
    const handleStorageChange = () => {
      loadBackupSettings();
    };

    window.addEventListener("storage", handleStorageChange);

    // Écouter les changements dans le même onglet
    const interval = setInterval(() => {
      loadBackupSettings();
    }, 1000); // Vérifier toutes les secondes

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const formatInterval = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} heure${hours > 1 ? "s" : ""}`;
      } else {
        return `${hours}h ${remainingMinutes}min`;
      }
    }
  };

  const loadBackupInfo = async () => {
    try {
      const [clients, products, pesees, transporteurs, templates] =
        await Promise.all([
          db.clients.count(),
          db.products.count(),
          db.pesees.count(),
          db.transporteurs.count(),
          db.sageTemplates.count(),
        ]);

      // Estimation de la taille (approximative)
      const estimatedSize = estimateBackupSize({
        clients,
        products,
        pesees,
        transporteurs,
        templates,
      });

      setBackupInfo({
        totalClients: clients,
        totalProducts: products,
        totalPesees: pesees,
        totalTransporteurs: transporteurs,
        totalTemplates: templates,
        estimatedSize,
      });
    } catch (error) {
      console.error(
        "Erreur lors du chargement des infos de sauvegarde:",
        error
      );
    } finally {
      setIsLoading(false);
    }
  };

  const estimateBackupSize = (counts: any): string => {
    // Estimation basée sur la taille moyenne des données
    const avgClientSize = 200; // bytes par client
    const avgProductSize = 150; // bytes par produit
    const avgPeseeSize = 500; // bytes par pesée
    const avgTransporteurSize = 180; // bytes par transporteur
    const avgTemplateSize = 1000; // bytes par template

    const totalBytes =
      counts.clients * avgClientSize +
      counts.products * avgProductSize +
      counts.pesees * avgPeseeSize +
      counts.transporteurs * avgTransporteurSize +
      counts.templates * avgTemplateSize +
      2000; // Overhead JSON + métadonnées

    return formatFileSize(totalBytes);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleTestBackup = async () => {
    try {
      await fileBackup.saveToFile();
    } catch (error) {
      console.error("Erreur lors du test de sauvegarde:", error);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement des informations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!backupInfo) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Informations de Sauvegarde
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistiques des données */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            Données à sauvegarder
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span>Clients</span>
              </div>
              <Badge variant="outline">{backupInfo.totalClients}</Badge>
            </div>

            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-green-600" />
                <span>Produits</span>
              </div>
              <Badge variant="outline">{backupInfo.totalProducts}</Badge>
            </div>

            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-orange-600" />
                <span>Pesées</span>
              </div>
              <Badge variant="outline">{backupInfo.totalPesees}</Badge>
            </div>

            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-purple-600" />
                <span>Transporteurs</span>
              </div>
              <Badge variant="outline">{backupInfo.totalTransporteurs}</Badge>
            </div>

            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-600" />
                <span>Templates Sage</span>
              </div>
              <Badge variant="outline">{backupInfo.totalTemplates}</Badge>
            </div>
          </div>
        </div>

        {/* Informations de sauvegarde */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sauvegarde Automatique
          </h4>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">
                Sauvegarde automatique activée
              </span>
            </div>
            <p className="text-sm text-green-700">
              Toutes vos données sont sauvegardées automatiquement toutes les{" "}
              {formatInterval(backupSettings.backupIntervalMinutes)} dans un
              fichier sur votre ordinateur.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 border rounded">
              <span className="font-medium">Taille estimée:</span>
              <Badge variant="secondary">{backupInfo.estimatedSize}</Badge>
            </div>

            <div className="flex items-center justify-between p-2 border rounded">
              <span className="font-medium">Fréquence:</span>
              <Badge variant="secondary">
                {formatInterval(backupSettings.backupIntervalMinutes)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Test de sauvegarde */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Download className="h-4 w-4" />
            Test de Sauvegarde
          </h4>

          <p className="text-sm text-muted-foreground">
            Testez la sauvegarde complète pour vérifier que tout fonctionne
            correctement.
          </p>

          <Button
            onClick={handleTestBackup}
            variant="outline"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Tester la sauvegarde maintenant
          </Button>
        </div>

        {/* Informations importantes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Ce qui est sauvegardé :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Tous vos clients et leurs informations</li>
                <li>Tous vos produits et leurs prix</li>
                <li>Toutes vos pesées et bons de pesée</li>
                <li>Tous vos transporteurs</li>
                <li>Tous vos templates Sage</li>
                <li>Tous vos paramètres utilisateur</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
