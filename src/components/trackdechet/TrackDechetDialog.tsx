import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, FileText, Truck } from "lucide-react";
import { Pesee, Product, Client, Transporteur, BSD } from "@/lib/database";

interface TrackDechetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pesee: Pesee;
  product?: Product;
  client?: Client;
  transporteur?: Transporteur;
}

export function TrackDechetDialog({
  isOpen,
  onClose,
  pesee,
  product,
  client,
  transporteur
}: TrackDechetDialogProps) {
  const [selectedCodeDechet, setSelectedCodeDechet] = useState(product?.codeDechets || "");
  const [isGenerating, setIsGenerating] = useState(false);

  // Vérifier si Track Déchet est applicable
  const isTrackDechetApplicable = () => {
    return client?.typeClient !== 'particulier' && 
           client?.trackDechetEnabled &&
           client?.trackDechetValidated &&
           client?.trackDechetToken &&
           product?.categorieDechet && 
           client?.siret && 
           transporteur?.siret;
  };

  // Codes déchets les plus courants dans le BTP
  const codesDechetsCommuns = [
    { code: "170101", description: "Béton" },
    { code: "170102", description: "Briques" },
    { code: "170103", description: "Tuiles et céramiques" },
    { code: "170107", description: "Mélanges de béton, briques, tuiles et céramiques" },
    { code: "170201", description: "Bois" },
    { code: "170202", description: "Verre" },
    { code: "170203", description: "Matières plastiques" },
    { code: "170301", description: "Mélanges bitumineux contenant du goudron" },
    { code: "170302", description: "Mélanges bitumineux ne contenant pas de goudron" },
    { code: "170504", description: "Terre et cailloux" },
    { code: "170506", description: "Boues de dragage" },
    { code: "170904", description: "Déchets de construction et de démolition en mélange" }
  ];

  const handleGenerateBSD = async () => {
    if (!selectedCodeDechet || !client?.trackDechetToken) return;
    
    setIsGenerating(true);
    try {
      // Import de l'API Track Déchet
      const { generateBSD } = await import('@/utils/trackdechetApi');
      
      const result = await generateBSD(
        pesee,
        client,
        transporteur!,
        product!,
        selectedCodeDechet,
        client.trackDechetToken
      );
      
      if (result.success) {
        console.log("BSD généré avec succès:", result.bsdId);
        // TODO: Afficher un message de succès avec l'ID du BSD
        onClose();
      } else {
        console.error("Erreur génération BSD:", result.error);
        // TODO: Afficher l'erreur à l'utilisateur
      }
    } catch (error) {
      console.error("Erreur génération BSD:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isTrackDechetApplicable()) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Track Déchet non applicable
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Track Déchet n'est applicable que pour les professionnels avec un token API configuré et validé.
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {client?.typeClient !== 'particulier' ? 
                  <CheckCircle className="h-4 w-4 text-green-500" /> : 
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                }
                <span className="text-sm">Client professionnel</span>
              </div>
              
              <div className="flex items-center gap-2">
                {client?.siret ? 
                  <CheckCircle className="h-4 w-4 text-green-500" /> : 
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                }
                <span className="text-sm">SIRET client renseigné</span>
              </div>
              
              <div className="flex items-center gap-2">
                {transporteur?.siret ? 
                  <CheckCircle className="h-4 w-4 text-green-500" /> : 
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                }
                <span className="text-sm">SIRET transporteur renseigné</span>
              </div>
              
               <div className="flex items-center gap-2">
                 {product?.categorieDechet ? 
                   <CheckCircle className="h-4 w-4 text-green-500" /> : 
                   <AlertCircle className="h-4 w-4 text-orange-500" />
                 }
                 <span className="text-sm">Catégorie déchet définie</span>
               </div>
               
               <div className="flex items-center gap-2">
                 {client?.trackDechetEnabled ? 
                   <CheckCircle className="h-4 w-4 text-green-500" /> : 
                   <AlertCircle className="h-4 w-4 text-orange-500" />
                 }
                 <span className="text-sm">Track Déchet activé</span>
               </div>
               
               <div className="flex items-center gap-2">
                 {client?.trackDechetToken && client?.trackDechetValidated ? 
                   <CheckCircle className="h-4 w-4 text-green-500" /> : 
                   <AlertCircle className="h-4 w-4 text-orange-500" />
                 }
                 <span className="text-sm">Token API configuré et validé</span>
               </div>
            </div>
            
            <Button onClick={onClose} className="w-full">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Générer un BSD Track Déchet
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informations pré-remplies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Producteur (Client)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>{client?.raisonSociale}</strong>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {client?.typeClient}
                  </Badge>
                </div>
                <div>SIRET: {client?.siret}</div>
                <div>{client?.adresse}</div>
                <div>{client?.codePostal} {client?.ville}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-500" />
                  Transporteur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>{transporteur?.prenom} {transporteur?.nom}</strong></div>
                <div>SIRET: {transporteur?.siret}</div>
                <div>{transporteur?.adresse}</div>
                <div>Plaque: {transporteur?.plaque || pesee.plaque}</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Sélection du code déchet */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Déchet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Produit:</strong> {product?.nom}
                </div>
                <div>
                  <strong>Catégorie:</strong>
                  <Badge variant="outline" className="ml-2">
                    {product?.categorieDechet}
                  </Badge>
                </div>
                <div>
                  <strong>Quantité:</strong> {pesee.net} tonnes
                </div>
                <div>
                  <strong>Date:</strong> {new Date(pesee.dateHeure).toLocaleDateString()}
                </div>
              </div>
              
              <div>
                <Label htmlFor="codeDechet">Code déchet européen *</Label>
                <Select 
                  value={selectedCodeDechet} 
                  onValueChange={setSelectedCodeDechet}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un code déchet" />
                  </SelectTrigger>
                  <SelectContent>
                    {product?.codeDechets && (
                      <SelectItem value={product.codeDechets}>
                        {product.codeDechets} - Code produit défini
                      </SelectItem>
                    )}
                    {codesDechetsCommuns.map((item) => (
                      <SelectItem key={item.code} value={item.code}>
                        {item.code} - {item.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              onClick={handleGenerateBSD}
              disabled={!selectedCodeDechet || isGenerating}
            >
              {isGenerating ? "Génération..." : "Générer BSD"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}