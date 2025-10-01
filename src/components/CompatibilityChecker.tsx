import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Monitor,
  Globe,
  HardDrive,
  Download,
  Upload,
  Database,
  Bell,
  Settings,
} from "lucide-react";
import {
  compatibilityTester,
  CompatibilityReport,
} from "@/utils/compatibilityTest";

export default function CompatibilityChecker() {
  const [report, setReport] = useState<CompatibilityReport | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const compatibilityReport = compatibilityTester.runCompatibilityTest();
    setReport(compatibilityReport);

    // Afficher automatiquement s'il y a des problèmes critiques
    const hasCriticalIssues =
      !compatibilityReport.indexedDB ||
      (!compatibilityReport.fileSystemAccessAPI &&
        !compatibilityReport.downloadAPI);

    if (hasCriticalIssues) {
      setIsVisible(true);
    }
  }, []);

  if (!report) return null;

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        ✅ Supporté
      </Badge>
    ) : (
      <Badge variant="destructive">❌ Non supporté</Badge>
    );
  };

  const getMethodBadge = (method: string) => {
    const colors = {
      fileSystemAPI: "bg-blue-100 text-blue-800",
      downloadAPI: "bg-yellow-100 text-yellow-800",
      none: "bg-red-100 text-red-800",
    };

    const labels = {
      fileSystemAPI: "File System API",
      downloadAPI: "Téléchargement classique",
      none: "Non disponible",
    };

    return (
      <Badge className={colors[method as keyof typeof colors]}>
        {labels[method as keyof typeof labels]}
      </Badge>
    );
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="mb-4"
      >
        <Settings className="h-4 w-4 mr-2" />
        Vérifier la compatibilité
      </Button>
    );
  }

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Compatibilité Cross-Platform
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informations système */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-blue-600" />
            <span className="font-medium">OS:</span>
            <Badge variant="outline">{report.os}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-green-600" />
            <span className="font-medium">Navigateur:</span>
            <Badge variant="outline">{report.browser}</Badge>
          </div>
        </div>

        {/* APIs supportées */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            APIs de Sauvegarde
          </h4>

          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                {getStatusIcon(report.fileSystemAccessAPI)}
                <span>File System Access API</span>
              </div>
              {getStatusBadge(report.fileSystemAccessAPI)}
            </div>

            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                {getStatusIcon(report.downloadAPI)}
                <span>Download API (fallback)</span>
              </div>
              {getStatusBadge(report.downloadAPI)}
            </div>
          </div>
        </div>

        {/* Autres APIs */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            Autres APIs
          </h4>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                {getStatusIcon(report.indexedDB)}
                <span>IndexedDB</span>
              </div>
              {getStatusBadge(report.indexedDB)}
            </div>

            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                {getStatusIcon(report.serviceWorker)}
                <span>Service Worker</span>
              </div>
              {getStatusBadge(report.serviceWorker)}
            </div>

            <div className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                {getStatusIcon(report.notifications)}
                <span>Notifications</span>
              </div>
              {getStatusBadge(report.notifications)}
            </div>
          </div>
        </div>

        {/* Test de sauvegarde */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Download className="h-4 w-4" />
            Test de Sauvegarde
          </h4>

          {(() => {
            const backupTest = compatibilityTester.testBackupCompatibility();
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(backupTest.canSave)}
                    <span>Sauvegarde</span>
                  </div>
                  {getStatusBadge(backupTest.canSave)}
                </div>

                <div className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(backupTest.canRestore)}
                    <span>Restauration</span>
                  </div>
                  {getStatusBadge(backupTest.canRestore)}
                </div>

                <div className="flex items-center justify-between p-2 border rounded">
                  <span className="font-medium">Méthode utilisée:</span>
                  {getMethodBadge(backupTest.method)}
                </div>

                {backupTest.issues.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {backupTest.issues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            );
          })()}
        </div>

        {/* Recommandations */}
        {report.recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Info className="h-4 w-4" />
              Recommandations
            </h4>

            <div className="space-y-2">
              {report.recommendations.map((rec, index) => (
                <Alert key={index}>
                  <Info className="h-4 w-4" />
                  <AlertDescription>{rec}</AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVisible(false)}
          >
            Masquer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              compatibilityTester.logCompatibilityReport();
              console.log("📋 Rapport détaillé affiché dans la console");
            }}
          >
            Console détaillée
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}



