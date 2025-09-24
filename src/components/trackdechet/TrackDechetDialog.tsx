import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Pesee, Product, Client, Transporteur } from '@/lib/database';
import { generateBSD } from '@/utils/trackdechetApi';
import { getTrackDechetToken, isTrackDechetReady } from '@/lib/globalSettings';
import { useToast } from '@/hooks/use-toast';

interface TrackDechetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pesee?: Pesee;
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
  const [isApplicable, setIsApplicable] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Vérifier si Track Déchet est applicable
  const checkTrackDechetApplicability = async (): Promise<boolean> => {
    if (client?.typeClient === 'particulier' || !client?.trackDechetEnabled) {
      return false;
    }

    // Vérifier la configuration globale
    const isGloballyReady = await isTrackDechetReady();
    if (!isGloballyReady) {
      return false;
    }

    // Vérifier les autres conditions
    return !!(product?.categorieDechet && 
              client?.siret && 
              transporteur?.siret);
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

  // Générer le BSD
  const handleGenerateBSD = async () => {
    if (!selectedCodeDechet || !pesee || !client || !transporteur || !product) {
      return;
    }

    setIsGenerating(true);
    try {
      // Récupérer le token global
      const globalToken = await getTrackDechetToken();
      if (!globalToken) {
        toast({
          title: "Erreur",
          description: "Token Track Déchet non configuré. Allez dans Paramètres → Track Déchet",
          variant: "destructive"
        });
        return;
      }

      const result = await generateBSD(
        pesee,
        client,
        transporteur, 
        product,
        selectedCodeDechet,
        globalToken
      );

      if (result.success) {
        toast({
          title: "BSD généré avec succès",
          description: `BSD ${result.bsdId} créé dans Track Déchet`
        });
        onClose();
      } else {
        toast({
          title: "Erreur génération BSD",
          description: result.error || "Une erreur est survenue",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur génération BSD:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le BSD",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Vérifier l'applicabilité à l'ouverture
  useEffect(() => {
    const checkApplicability = async () => {
      if (isOpen) {
        const applicable = await checkTrackDechetApplicability();
        setIsApplicable(applicable);
      }
    };
    
    checkApplicability();
  }, [isOpen, client, product, transporteur]);

  // Si on ne sait pas encore si c'est applicable
  if (isApplicable === null) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Track Déchet - Génération BSD</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Vérification de la configuration...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Si Track Déchet n'est pas applicable
  if (!isApplicable) {
    const missingRequirements: string[] = [];
    
    if (client?.typeClient === 'particulier') {
      missingRequirements.push("Track Déchet n'est disponible que pour les clients professionnels");
    }
    
    if (!client?.trackDechetEnabled) {
      missingRequirements.push("Track Déchet n'est pas activé pour ce client");
    }
    
    if (!product?.categorieDechet) {
      missingRequirements.push("Le produit doit avoir une catégorie de déchet définie");
    }
    
    if (!client?.siret) {
      missingRequirements.push("Le client doit avoir un SIRET");
    }
    
    if (!transporteur?.siret) {
      missingRequirements.push("Le transporteur doit avoir un SIRET");
    }

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Track Déchet non applicable</DialogTitle>
            <DialogDescription>
              Les conditions suivantes ne sont pas remplies pour générer un BSD :
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <ul className="space-y-2">
              {missingRequirements.map((requirement, index) => (
                <li key={index} className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{requirement}</span>
                </li>
              ))}
            </ul>
            
            {missingRequirements.length === 1 && missingRequirements[0].includes("Track Déchet n'est pas activé") && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  💡 Activez Track Déchet pour ce client dans sa fiche pour pouvoir générer des BSD automatiquement.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Interface principale pour générer le BSD
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Génération BSD Track Déchet</span>
            <Badge variant="secondary">Automatique</Badge>
          </DialogTitle>
          <DialogDescription>
            Génération automatique d'un bordereau de suivi des déchets
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informations du producteur (client) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Producteur (Émetteur)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <strong>{client?.raisonSociale}</strong>
              </div>
              <div className="text-sm text-muted-foreground">
                SIRET: {client?.siret}
              </div>
              <div className="text-sm text-muted-foreground">
                {client?.adresse}
              </div>
              <div className="text-sm text-muted-foreground">
                {client?.codePostal} {client?.ville}
              </div>
            </CardContent>
          </Card>

          {/* Informations du transporteur */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transporteur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <strong>{transporteur?.prenom} {transporteur?.nom}</strong>
              </div>
              <div className="text-sm text-muted-foreground">
                SIRET: {transporteur?.siret}
              </div>
              <div className="text-sm text-muted-foreground">
                {transporteur?.adresse}
              </div>
              <div className="text-sm text-muted-foreground">
                {transporteur?.codePostal} {transporteur?.ville}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informations sur le déchet */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Déchet</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Produit</Label>
              <p className="text-sm">{product?.nom}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Catégorie</Label>
              <Badge variant="secondary" className="text-xs">
                {product?.categorieDechet}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Quantité</Label>
              <p className="text-sm">{pesee?.net} tonnes</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Date</Label>
              <p className="text-sm">
                {pesee?.dateHeure ? new Date(pesee.dateHeure).toLocaleDateString() : 'Non définie'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sélection du code déchet */}
        <div className="space-y-2">
          <Label htmlFor="codeDechet">Code déchet européen *</Label>
          <Select value={selectedCodeDechet} onValueChange={setSelectedCodeDechet}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez un code déchet" />
            </SelectTrigger>
            <SelectContent>
              {/* Code du produit s'il est défini */}
              {product?.codeDechets && (
                <>
                  <SelectItem value={product.codeDechets}>
                    {product.codeDechets} - Code produit
                  </SelectItem>
                  <div className="border-b my-1" />
                </>
              )}
              
              {/* Codes communs */}
              {codesDechetsCommuns.map((code) => (
                <SelectItem key={code.code} value={code.code}>
                  {code.code} - {code.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Sélectionnez le code déchet européen approprié pour cette pesée
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleGenerateBSD}
            disabled={!selectedCodeDechet || isGenerating}
            className="min-w-[120px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Génération...
              </>
            ) : (
              "Générer BSD"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}