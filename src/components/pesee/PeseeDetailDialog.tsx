import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Printer,
  FileText,
  Calendar,
  User,
  Truck,
  Package,
  Weight,
  Recycle,
} from "lucide-react";
import { Pesee, Product, Transporteur, Client, db } from "@/lib/database";
import {
  handlePrint,
  handlePrintBothBonAndInvoice,
  getTransporteurNameForSave,
} from "@/utils/peseeUtils";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import { TrackDechetDialog } from "@/components/trackdechet/TrackDechetDialog";
import { PeseeTab } from "@/hooks/usePeseeTabs";

interface PeseeDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pesee: Pesee | null;
  products: Product[];
  transporteurs: Transporteur[];
}

export const PeseeDetailDialog = ({
  isOpen,
  onClose,
  pesee,
  products,
  transporteurs,
}: PeseeDetailDialogProps) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printContent, setPrintContent] = useState("");
  const [printTitle, setPrintTitle] = useState("");
  const [client, setClient] = useState<Client | null>(null);
  const [trackDechetOpen, setTrackDechetOpen] = useState(false);

  // Charger les données du client quand la pesée change
  useEffect(() => {
    const loadClient = async () => {
      if (pesee && pesee.clientId) {
        try {
          const clientData = await db.clients.get(pesee.clientId);
          setClient(clientData || null);
        } catch (error) {
          console.error("Error loading client:", error);
          setClient(null);
        }
      } else {
        setClient(null);
      }
    };

    if (isOpen && pesee) {
      loadClient();
    }
  }, [pesee, isOpen]);

  if (!pesee) return null;

  const selectedProduct = products.find((p) => p.id === pesee.produitId);
  const selectedTransporteur = transporteurs.find(
    (t) => t.id === pesee.transporteurId
  );

  // Obtenir le nom du transporteur à afficher
  const getDisplayedTransporteurName = () => {
    // Priorité 1 : Si un transporteur libre a été saisi et sauvegardé
    if (pesee.transporteurLibre && pesee.transporteurLibre.trim()) {
      return pesee.transporteurLibre.trim();
    }

    // Priorité 2 : Si un transporteur officiel est sélectionné
    if (selectedTransporteur) {
      return `${selectedTransporteur.prenom} ${selectedTransporteur.nom}`;
    }

    // Priorité 3 : Utiliser la même logique que pour la sauvegarde pour obtenir le nom du transporteur
    const formDataForTransporteur = {
      transporteurId: pesee.transporteurId,
      transporteurLibre: pesee.transporteurLibre,
      nomEntreprise: pesee.nomEntreprise,
      typeClient: pesee.typeClient,
    };

    const transporteurName = getTransporteurNameForSave(
      formDataForTransporteur,
      transporteurs,
      ""
    );
    return transporteurName || pesee.nomEntreprise;
  };

  const displayedTransporteurName = getDisplayedTransporteurName();

  // Convertir la pesée en format pour l'impression
  const formDataForPrint: PeseeTab["formData"] = {
    numeroBon: pesee.numeroBon,
    nomEntreprise: pesee.nomEntreprise,
    plaque: pesee.plaque,
    chantier: pesee.chantier || "",
    produitId: pesee.produitId,
    poidsEntree: pesee.poidsEntree.toString(),
    poidsSortie: pesee.poidsSortie.toString(),
    moyenPaiement: pesee.moyenPaiement as "Direct" | "En compte",
    clientId: pesee.clientId || 0,
    transporteurId: pesee.transporteurId || 0,
    transporteurLibre: pesee.transporteurLibre || "",
    typeClient: pesee.typeClient,
  };

  const handlePrintBon = async () => {
    setIsPrinting(true);
    try {
      const content = handlePrint(
        formDataForPrint,
        products,
        transporteurs,
        false,
        client
      );
      setPrintContent(content);
      setPrintTitle("Bon de peséeeee");
      setPrintPreviewOpen(true);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintFacture = async () => {
    setIsPrinting(true);
    try {
      const content = handlePrint(
        formDataForPrint,
        products,
        transporteurs,
        true,
        client
      );
      setPrintContent(content);
      setPrintTitle("Facture");
      setPrintPreviewOpen(true);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintBoth = async () => {
    setIsPrinting(true);
    try {
      const { bonContent, invoiceContent } = await handlePrintBothBonAndInvoice(
        formDataForPrint,
        products,
        transporteurs,
        client
      );
      setPrintContent(
        bonContent +
          '<div style="page-break-before: always;"></div>' +
          invoiceContent
      );
      setPrintTitle("Bon de peséeeee + Facture");
      setPrintPreviewOpen(true);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Détails de la pesée - {pesee.numeroBon}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Informations générales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Date et heure
                    </label>
                    <p className="mt-1">
                      {pesee.dateHeure.toLocaleDateString()} à{" "}
                      {pesee.dateHeure.toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Numéro de bon
                    </label>
                    <p className="mt-1 font-semibold">{pesee.numeroBon}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Plaque
                    </label>
                    <p className="mt-1">{pesee.plaque}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Moyen de paiement
                    </label>
                    <p className="mt-1">{pesee.moyenPaiement}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informations client */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Informations client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Nom de l'entreprise
                    </label>
                    <p className="mt-1">{pesee.nomEntreprise}</p>
                  </div>
                  {pesee.chantier && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Chantier
                      </label>
                      <p className="mt-1">{pesee.chantier}</p>
                    </div>
                  )}
                  {client && (
                    <div className="space-y-2">
                      {client.siret && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            SIRET
                          </label>
                          <p className="mt-1">{client.siret}</p>
                        </div>
                      )}
                      {client.email && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Email
                          </label>
                          <p className="mt-1">{client.email}</p>
                        </div>
                      )}
                      {client.telephone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Téléphone
                          </label>
                          <p className="mt-1">{client.telephone}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informations transporteur */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  Transporteur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Nom du transporteur
                  </label>
                  <p className="mt-1">{displayedTransporteurName}</p>
                </div>
              </CardContent>
            </Card>

            {/* Informations produit et pesée */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Produit et pesée
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Produit
                  </label>
                  <p className="mt-1">
                    {selectedProduct?.nom || "Produit non trouvé"}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Poids d'entrée
                    </label>
                    <div className="flex items-center mt-1">
                      <Weight className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{pesee.poidsEntree} T</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Poids de sortie
                    </label>
                    <div className="flex items-center mt-1">
                      <Weight className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{pesee.poidsSortie} T</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Poids net
                    </label>
                    <div className="flex items-center mt-1">
                      <Weight className="h-4 w-4 mr-1 text-green-600" />
                      <span className="font-semibold text-green-600">
                        {pesee.net} T
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Prix HT
                    </label>
                    <p className="mt-1 font-semibold text-green-600">
                      {pesee.prixHT.toFixed(2)}€
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Prix TTC
                    </label>
                    <p className="mt-1 font-semibold text-green-600">
                      {pesee.prixTTC.toFixed(2)}€
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions d'impression */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Printer className="h-5 w-5 mr-2" />
                  Actions d'impression
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      onClick={handlePrintBon}
                      disabled={isPrinting}
                      variant="outline"
                      className="justify-center text-sm"
                      size="sm"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Bon de peséeeee
                    </Button>
                    <Button
                      onClick={handlePrintFacture}
                      disabled={isPrinting}
                      variant="outline"
                      className="justify-center text-sm"
                      size="sm"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Facture
                    </Button>
                  </div>
                  <Button
                    onClick={handlePrintBoth}
                    disabled={isPrinting}
                    variant="secondary"
                    className="w-full justify-center text-sm"
                    size="sm"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    <FileText className="h-4 w-4 mr-2" />
                    Bon + Facture
                  </Button>

                  {/* Bouton Track Déchet - visible seulement pour professionnels */}
                  {pesee && client?.typeClient !== "particulier" && (
                    <Button
                      onClick={() => setTrackDechetOpen(true)}
                      variant="outline"
                      className="w-full justify-center text-sm border-green-200 hover:bg-green-50"
                      size="sm"
                    >
                      <Recycle className="h-4 w-4 mr-2 text-green-600" />
                      Track Déchet
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <PrintPreviewDialog
        isOpen={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        content={printContent}
        title={printTitle}
      />

      {/* Dialog Track Déchet */}
      {pesee && (
        <TrackDechetDialog
          isOpen={trackDechetOpen}
          onClose={() => setTrackDechetOpen(false)}
          pesee={pesee}
          product={selectedProduct}
          client={client}
          transporteur={selectedTransporteur}
        />
      )}
    </>
  );
};
