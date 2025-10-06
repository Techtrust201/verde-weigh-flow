import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, Info } from "lucide-react";
import { Product, Client, db } from "@/lib/database";

interface ProductWeightSectionProps {
  currentData: any;
  products: Product[];
  updateCurrentTab: (updates: any) => void;
}

export const ProductWeightSection = ({
  currentData,
  products,
  updateCurrentTab,
}: ProductWeightSectionProps) => {
  const [client, setClient] = useState<Client | null>(null);
  const [calculatedCost, setCalculatedCost] = useState<{
    ht: number;
    ttc: number;
    taxesDetails?: Array<{ nom: string; taux: number; montant: number }>;
    montantTVA?: number;
    tauxTVA?: number;
  } | null>(null);

  useEffect(() => {
    if (currentData?.clientId) {
      loadClient();
    } else {
      setClient(null);
    }
  }, [currentData?.clientId]);

  useEffect(() => {
    if (
      currentData?.produitId &&
      currentData?.poidsEntree &&
      currentData?.poidsSortie
    ) {
      calculateCost();
    } else {
      setCalculatedCost(null);
    }
  }, [
    currentData?.produitId,
    currentData?.poidsEntree,
    currentData?.poidsSortie,
    client,
  ]);

  const loadClient = async () => {
    if (!currentData?.clientId) return;
    try {
      const clientData = await db.clients.get(currentData.clientId);
      setClient(clientData || null);
    } catch (error) {
      console.error("Erreur lors du chargement du client:", error);
      setClient(null);
    }
  };

  const calculateCost = async () => {
    if (
      !currentData?.produitId ||
      !currentData?.poidsEntree ||
      !currentData?.poidsSortie
    ) {
      setCalculatedCost(null);
      return;
    }

    const selectedProduct = products.find(
      (p) => p.id === currentData.produitId
    );
    if (!selectedProduct) {
      setCalculatedCost(null);
      return;
    }

    // Convertir les valeurs en nombres (en tonnes directement)
    const poidsEntree =
      parseFloat(currentData.poidsEntree.replace(",", ".")) || 0;
    const poidsSortie =
      parseFloat(currentData.poidsSortie.replace(",", ".")) || 0;
    const net = Math.abs(poidsEntree - poidsSortie);

    // Utiliser le tarif standard par défaut
    let prixHT = selectedProduct.prixHT;
    let prixTTC = selectedProduct.prixTTC;

    // Appliquer le tarif préférentiel UNIQUEMENT si :
    // 1. Un client est sélectionné
    // 2. Ce client a des tarifs préférentiels définis
    // 3. Ce client a un tarif préférentiel pour ce produit spécifique
    if (
      client &&
      client.tarifsPreferentiels &&
      client.tarifsPreferentiels[currentData.produitId] &&
      currentData.clientId === client.id
    ) {
      const tarifPref = client.tarifsPreferentiels[currentData.produitId];
      if (tarifPref.prixHT && tarifPref.prixTTC) {
        prixHT = tarifPref.prixHT;
        prixTTC = tarifPref.prixTTC;
        console.log(
          `Tarif préférentiel appliqué pour le client ${client.raisonSociale} - Produit ${selectedProduct.nom}: ${prixHT}€ HT`
        );
      }
    }

    // Calculer le total HT
    const totalHT = net * prixHT;

    // Récupérer les taxes actives et calculer le total TTC avec taxes
    try {
      const activeTaxes = (await db.taxes.toArray()).filter((t) => t.active);
      const taxesDetails = activeTaxes.map((tax) => ({
        nom: tax.nom,
        taux: tax.taux,
        montant: totalHT * (tax.taux / 100),
      }));

      const totalTaxes = taxesDetails.reduce(
        (sum, tax) => sum + tax.montant,
        0
      );
      const tauxTVA = selectedProduct.tauxTVA || 20;
      const montantTVA = totalHT * (tauxTVA / 100);
      const totalTTC = totalHT + montantTVA + totalTaxes;

      setCalculatedCost({
        ht: totalHT,
        ttc: totalTTC,
        taxesDetails,
        montantTVA,
        tauxTVA,
      });
    } catch (error) {
      console.error("Erreur lors du calcul des taxes:", error);
      // Fallback au calcul simple si erreur
      setCalculatedCost({
        ht: totalHT,
        ttc: net * prixTTC,
      });
    }
  };

  const selectedProduct = products.find((p) => p.id === currentData?.produitId);

  // Vérifier si le client actuel a un tarif préférentiel pour le produit sélectionné
  const hasPrefPricing =
    client &&
    selectedProduct &&
    client.tarifsPreferentiels &&
    client.tarifsPreferentiels[selectedProduct.id!] &&
    currentData?.clientId === client.id;

  const getProductDisplayPrice = (product: Product) => {
    // Afficher le tarif préférentiel UNIQUEMENT pour le client qui l'a défini
    if (
      client &&
      client.tarifsPreferentiels &&
      client.tarifsPreferentiels[product.id!] &&
      currentData?.clientId === client.id
    ) {
      const prefPrice = client.tarifsPreferentiels[product.id!];
      if (prefPrice.prixTTC) {
        return `${prefPrice.prixTTC.toFixed(2)}€ TTC (Tarif préférentiel)`;
      }
    }
    return `${product.prixTTC}€ TTC`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Produit et Poids
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="produit">Produit *</Label>
              <Select
                value={currentData?.produitId?.toString() || ""}
                onValueChange={(value) =>
                  updateCurrentTab({ produitId: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id!.toString()}>
                      <div className="flex flex-col">
                        <span className="text-start">{product.nom}</span>
                        <span className="text-xs text-muted-foreground">
                          {getProductDisplayPrice(product)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasPrefPricing && (
                <div className="mt-1 flex items-center gap-1">
                  <Info className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-blue-600">
                    Tarif préférentiel appliqué pour {client?.raisonSociale}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="poidsEntree">Poids d'entrée (tonnes)</Label>
              <Input
                id="poidsEntree"
                type="text"
                value={currentData?.poidsEntree || ""}
                onChange={(e) =>
                  updateCurrentTab({ poidsEntree: e.target.value })
                }
                placeholder="0,000"
              />
            </div>

            <div>
              <Label htmlFor="poidsSortie">Poids de sortie (tonnes)</Label>
              <Input
                id="poidsSortie"
                type="text"
                value={currentData?.poidsSortie || ""}
                onChange={(e) =>
                  updateCurrentTab({ poidsSortie: e.target.value })
                }
                placeholder="0,000"
              />
            </div>
          </div>

          {/* Calcul du coût en temps réel - VERSION AMÉLIORÉE */}
          {calculatedCost && (
            <Card className="border-2 border-green-600 bg-white shadow-lg">
              <CardContent className="pt-6 pb-6">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-green-700 mb-2">
                    COÛT CALCULÉ
                  </h3>
                  <div className="text-2xl font-semibold text-gray-700 mb-1">
                    Poids net:{" "}
                    <span className="text-2xl font-black text-green-600 mb-2">
                      {/* <div className=""> */}
                      {Math.abs(
                        (parseFloat(
                          currentData.poidsEntree?.replace(",", ".")
                        ) || 0) -
                          (parseFloat(
                            currentData.poidsSortie?.replace(",", ".")
                          ) || 0)
                      ).toFixed(3)}{" "}
                      tonnes
                    </span>
                  </div>
                  {hasPrefPricing && (
                    <div className="text-base font-medium text-blue-700 mb-2">
                      🏢 Client: {client?.raisonSociale}
                    </div>
                  )}
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <div className="text-center">
                    <div className="text-2xl font-black text-green-800 mb-2">
                      {calculatedCost.ttc.toFixed(2)}€ TTC
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      {calculatedCost.ht.toFixed(2)}€ HT
                    </div>
                  </div>

                  {/* Détails des taxes */}
                  {calculatedCost.taxesDetails &&
                    calculatedCost.taxesDetails.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-green-300">
                        <div className="text-sm font-semibold text-green-700 mb-2">
                          Détail des taxes :
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>TVA ({calculatedCost.tauxTVA}%)</span>
                            <span className="font-semibold">
                              {calculatedCost.montantTVA?.toFixed(2)}€
                            </span>
                          </div>
                          {calculatedCost.taxesDetails.map((tax, index) => (
                            <div key={index} className="flex justify-between">
                              <span>
                                {tax.nom} ({tax.taux}%)
                              </span>
                              <span className="font-semibold">
                                {tax.montant.toFixed(2)}€
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>

                {hasPrefPricing && (
                  <div className="mt-4 text-center">
                    <Badge
                      variant="outline"
                      className="text-green-700 border-green-400 bg-green-50 font-semibold px-4 py-2"
                    >
                      ⭐ Tarif préférentiel exclusif à ce client
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
