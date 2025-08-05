import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, FileText, Calendar, User, Truck, Package, Weight } from 'lucide-react';
import { Pesee, Product, Transporteur } from '@/lib/database';
import { handlePrint, handlePrintBothBonAndInvoice } from '@/utils/peseeUtils';
import { PeseeTab } from '@/hooks/usePeseeTabs';

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
  transporteurs
}: PeseeDetailDialogProps) => {
  const [isPrinting, setIsPrinting] = useState(false);

  if (!pesee) return null;

  const selectedProduct = products.find(p => p.id === pesee.produitId);
  const selectedTransporteur = transporteurs.find(t => t.id === pesee.transporteurId);

  // Convertir la pesée en format pour l'impression
  const formDataForPrint: PeseeTab['formData'] = {
    numeroBon: pesee.numeroBon,
    nomEntreprise: pesee.nomEntreprise,
    plaque: pesee.plaque,
    chantier: pesee.chantier,
    produitId: pesee.produitId,
    transporteurId: pesee.transporteurId,
    poidsEntree: pesee.poidsEntree.toString(),
    poidsSortie: pesee.poidsSortie.toString(),
    moyenPaiement: pesee.moyenPaiement as 'Direct' | 'En compte',
    typeClient: pesee.typeClient,
    clientId: pesee.clientId || 0
  };

  const handlePrintBon = async () => {
    setIsPrinting(true);
    try {
      await handlePrint(formDataForPrint, products, transporteurs, false);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintFacture = async () => {
    setIsPrinting(true);
    try {
      await handlePrint(formDataForPrint, products, transporteurs, true);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintBoth = async () => {
    setIsPrinting(true);
    try {
      await handlePrintBothBonAndInvoice(formDataForPrint, products, transporteurs);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
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
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Informations générales
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Date et heure:</span>
                  <p className="font-medium">
                    {pesee.dateHeure.toLocaleDateString()} à {pesee.dateHeure.toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Numéro de bon:</span>
                  <p className="font-medium">{pesee.numeroBon}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Moyen de paiement:</span>
                  <Badge variant="outline">{pesee.moyenPaiement}</Badge>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Type de client:</span>
                  <Badge variant="secondary">{pesee.typeClient}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client/Entreprise */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <User className="h-4 w-4 mr-2" />
                {pesee.typeClient === 'particulier' ? 'Client' : 'Entreprise'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Nom:</span>
                  <p className="font-medium">{pesee.nomEntreprise}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Plaque:</span>
                  <p className="font-medium">{pesee.plaque}</p>
                </div>
                {pesee.chantier && (
                  <div className="col-span-2">
                    <span className="text-sm text-gray-600">Chantier:</span>
                    <p className="font-medium">{pesee.chantier}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Produit et transporteur */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Produit et transport
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Produit:</span>
                  <p className="font-medium">{selectedProduct?.nom || 'Non défini'}</p>
                </div>
                {selectedTransporteur && (
                  <div>
                    <span className="text-sm text-gray-600">Transporteur:</span>
                    <p className="font-medium">
                      {selectedTransporteur.prenom} {selectedTransporteur.nom}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Poids */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Weight className="h-4 w-4 mr-2" />
                Pesée
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Poids entrée:</span>
                  <p className="font-medium">{pesee.poidsEntree.toFixed(3)} T</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Poids sortie:</span>
                  <p className="font-medium">{pesee.poidsSortie.toFixed(3)} T</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Poids net:</span>
                  <Badge className="text-base font-semibold">
                    {pesee.net.toFixed(3)} T
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prix */}
          {(pesee.prixHT || pesee.prixTTC) && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Prix</h3>
                <div className="grid grid-cols-2 gap-4">
                  {pesee.prixHT && (
                    <div>
                      <span className="text-sm text-gray-600">Prix HT:</span>
                      <p className="font-medium text-green-600">{pesee.prixHT.toFixed(2)} €</p>
                    </div>
                  )}
                  {pesee.prixTTC && (
                    <div>
                      <span className="text-sm text-gray-600">Prix TTC:</span>
                      <p className="font-medium text-green-600">{pesee.prixTTC.toFixed(2)} €</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Boutons d'impression */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Printer className="h-4 w-4 mr-2" />
                Options d'impression
              </h3>
              <div className="flex flex-col space-y-2">
                <Button 
                  onClick={handlePrintBon} 
                  disabled={isPrinting}
                  className="justify-start"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimer le bon de pesée
                </Button>
                <Button 
                  onClick={handlePrintFacture} 
                  disabled={isPrinting}
                  variant="outline"
                  className="justify-start"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Imprimer la facture
                </Button>
                <Button 
                  onClick={handlePrintBoth} 
                  disabled={isPrinting}
                  variant="secondary"
                  className="justify-start"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  <FileText className="h-4 w-4 mr-2" />
                  Imprimer bon + facture
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
