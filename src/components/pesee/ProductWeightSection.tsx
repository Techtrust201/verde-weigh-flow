import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
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
import { PeseeTabFormData } from "@/hooks/usePeseeTabs";
import { cn, formatWeight } from "@/lib/utils";

interface ProductWeightSectionProps {
  currentData: PeseeTabFormData;
  products: Product[];
  updateCurrentTab: (updates: Partial<PeseeTabFormData>) => void;
  validationErrors?: {
    plaque?: boolean;
    nomEntreprise?: boolean;
    chantier?: boolean;
    produitId?: boolean;
    poidsEntree?: boolean;
    poidsSortie?: boolean;
  };
}

export const ProductWeightSection = ({
  currentData,
  products,
  updateCurrentTab,
  validationErrors = {},
}: ProductWeightSectionProps) => {
  const [client, setClient] = useState<Client | null>(null);
  const [calculatedCost, setCalculatedCost] = useState<{
    ht: number;
    ttc: number;
    taxesDetails?: Array<{
      nom: string;
      taux: number;
      montant: number;
      tvaAppliquee?: number;
    }>;
    montantTVA?: number;
    tauxTVA?: number;
  } | null>(null);

  const loadClient = useCallback(async () => {
    if (!currentData?.clientId) {
      setClient(null);
      return;
    }
    try {
      const clientData = await db.clients.get(currentData.clientId);
      setClient(clientData || null);
    } catch (error) {
      console.error("Erreur lors du chargement du client:", error);
      setClient(null);
    }
  }, [currentData?.clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  const calculateCost = useCallback(async () => {
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
        tvaAppliquee: tax.tauxTVA ?? 20,
      }));

      const totalTaxes = taxesDetails.reduce(
        (sum, tax) => sum + tax.montant,
        0
      );
      const tauxTVA = selectedProduct.tauxTVA || 20;
      const montantTVAProduit = totalHT * (tauxTVA / 100);
      const montantTVATaxes = taxesDetails.reduce(
        (sum, t) => sum + t.montant * ((t.tvaAppliquee ?? 20) / 100),
        0
      );
      const montantTVA = montantTVAProduit + montantTVATaxes;
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
  }, [currentData, products, client]);

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
    calculateCost,
    currentData?.produitId,
    currentData?.poidsEntree,
    currentData?.poidsSortie,
  ]);

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
    <div className="space-y-3 flex-1 flex flex-col h-full">
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-gray-50/50 py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" />
            Produit et Poids
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label
                htmlFor="produit"
                className={cn(validationErrors.produitId && "text-red-600")}
              >
                Produit *
                {validationErrors.produitId && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
              <Combobox
                options={products
                  .sort((a, b) => {
                    // Favoris en premier
                    if (a.isFavorite && !b.isFavorite) return -1;
                    if (!a.isFavorite && b.isFavorite) return 1;
                    // Sinon, ordre alphabétique
                    return a.nom.localeCompare(b.nom);
                  })
                  .map((product) => ({
                    value: String(product.id!),
                    label: product.nom,
                    keywords: product.codeProduct,
                    isFavorite: product.isFavorite,
                  }))}
                value={currentData?.produitId?.toString() || ""}
                onValueChange={(value) => {
                  const id = parseInt(value);
                  if (!Number.isNaN(id)) {
                    updateCurrentTab({ produitId: id });
                  }
                }}
                placeholder="Sélectionner un produit"
                searchPlaceholder="Rechercher un produit..."
                className={cn(
                  validationErrors.produitId &&
                    "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500"
                )}
              />
              {validationErrors.produitId && (
                <p className="text-red-600 text-sm mt-1">
                  Ce champ est obligatoire
                </p>
              )}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label
                htmlFor="poidsEntree"
                className={cn(validationErrors?.poidsEntree && "text-red-600")}
              >
                Poids d'entrée (tonnes) *
                {validationErrors?.poidsEntree && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
              <Input
                id="poidsEntree"
                type="text"
                value={currentData?.poidsEntree || ""}
                onChange={(e) =>
                  updateCurrentTab({ poidsEntree: e.target.value })
                }
                placeholder="0,000"
                autoComplete="off"
                className={cn(
                  validationErrors?.poidsEntree &&
                    "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500"
                )}
              />
              {validationErrors?.poidsEntree && (
                <p className="text-red-600 text-sm mt-1">
                  Ce champ est obligatoire
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="poidsSortie"
                className={cn(validationErrors?.poidsSortie && "text-red-600")}
              >
                Poids de sortie (tonnes) *
                {validationErrors?.poidsSortie && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
              <Input
                id="poidsSortie"
                type="text"
                value={currentData?.poidsSortie || ""}
                onChange={(e) =>
                  updateCurrentTab({ poidsSortie: e.target.value })
                }
                placeholder="0,000"
                autoComplete="off"
                className={cn(
                  validationErrors?.poidsSortie &&
                    "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500"
                )}
              />
              {validationErrors?.poidsSortie && (
                <p className="text-red-600 text-sm mt-1">
                  Ce champ est obligatoire
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="reference">Référence (optionnel)</Label>
              <Input
                id="reference"
                type="text"
                value={currentData?.reference || ""}
                onChange={(e) =>
                  updateCurrentTab({ reference: e.target.value })
                }
                placeholder="Référence pour la facture"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Calcul du coût en temps réel - Toujours réserver l'espace pour éviter le redimensionnement */}
          <div className="min-h-[240px]">
            {calculatedCost ? (
              <Card className="border-2 border-green-600 bg-white shadow-md">
                <CardContent className="pt-3 pb-3">
                  <div className="text-center mb-2">
                    <h3 className="text-base font-bold text-green-700 mb-1">
                      COÛT CALCULÉ
                    </h3>
                    <div className="text-lg font-semibold text-gray-700 mb-1">
                      Poids net:{" "}
                      <span className="text-lg font-black text-green-600">
                        {formatWeight(
                          Math.abs(
                          (parseFloat(
                            currentData.poidsEntree?.replace(",", ".")
                          ) || 0) -
                            (parseFloat(
                              currentData.poidsSortie?.replace(",", ".")
                            ) || 0)
                          )
                        )}{" "}
                        tonnes
                      </span>
                    </div>
                    {hasPrefPricing && (
                      <div className="text-sm font-medium text-blue-700 mb-1">
                        🏢 Client: {client?.raisonSociale}
                      </div>
                    )}
                  </div>

                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-lg font-black text-green-800 mb-1">
                        {calculatedCost.ht.toFixed(2)}€ HT
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        {calculatedCost.ttc.toFixed(2)}€ TTC
                      </div>
                    </div>

                    {/* Détails des taxes */}
                    {calculatedCost.taxesDetails &&
                      calculatedCost.taxesDetails.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-green-300">
                          <div className="text-xs font-semibold text-green-700 mb-1.5">
                            Détail des taxes :
                          </div>
                          <div className="space-y-0.5 text-xs">
                            <div className="flex justify-between">
                              <span>
                                TVA produit ({calculatedCost.tauxTVA}%)
                              </span>
                              <span className="font-semibold">
                                {calculatedCost.montantTVA?.toFixed(2)}€
                              </span>
                            </div>
                            {calculatedCost.taxesDetails.map((tax, index) => {
                              const tvaTaxe =
                                tax.montant * ((tax.tvaAppliquee ?? 20) / 100);
                              return (
                                <div key={index} className="flex flex-col">
                                  <div className="flex justify-between">
                                    <span>
                                      {tax.nom} ({tax.taux}%)
                                    </span>
                                    <span className="font-semibold">
                                      {tax.montant.toFixed(2)}€
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-muted-foreground">
                                    <span className="pl-4">
                                      TVA sur {tax.nom} (
                                      {tax.tvaAppliquee ?? 20}
                                      %)
                                    </span>
                                    <span>{tvaTaxe.toFixed(2)}€</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </div>

                  {hasPrefPricing && (
                    <div className="mt-3 text-center">
                      <Badge
                        variant="outline"
                        className="text-green-700 border-green-400 bg-green-50 font-semibold px-3 py-1 text-xs"
                      >
                        ⭐ Tarif préférentiel exclusif à ce client
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="h-[240px]" aria-hidden="true" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
