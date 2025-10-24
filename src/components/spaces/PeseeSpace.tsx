import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedTabs } from "@/components/ui/enhanced-tabs";
import { Scale, Save, Printer, Plus, X } from "lucide-react";
import { db, Pesee, Client, Transporteur } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { usePeseeData } from "@/hooks/usePeseeData";
import { useTransporteurData } from "@/hooks/useTransporteurData";
import { usePeseeTabs, PeseeTab } from "@/hooks/usePeseeTabs";
import { PeseeFormSection } from "@/components/pesee/PeseeFormSection";
import { ProductWeightSection } from "@/components/pesee/ProductWeightSection";
import { RecentPeseesTab } from "@/components/pesee/RecentPeseesTab";
import { SaveConfirmDialog } from "@/components/pesee/SaveConfirmDialog";
import { handlePrint, handlePrintBothBonAndInvoice } from "@/utils/peseeUtils";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import { trackDechetProcessor } from "@/utils/trackdechetSyncProcessor";
import { isTrackDechetApplicable } from "@/utils/trackdechetValidation";
import { normalizeClientCode } from "@/utils/clientCodeUtils";

export default function PeseeSpace() {
  const { toast } = useToast();
  const { pesees, clients, products, loadData } = usePeseeData();
  const { transporteurs, loadTransporteurs } = useTransporteurData();
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    createNewTab,
    closeTab,
    updateCurrentTab,
    getCurrentTabData,
    generateBonNumber,
    generateUniqueBLNumber,
    getTabLabel,
  } = usePeseeTabs();
  const [showRecentTab, setShowRecentTab] = useState(false);
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [isAddChantierDialogOpen, setIsAddChantierDialogOpen] = useState(false);
  const [isAddTransporteurDialogOpen, setIsAddTransporteurDialogOpen] =
    useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [newChantier, setNewChantier] = useState("");
  const [newTransporteurForm, setNewTransporteurForm] = useState<
    Partial<Transporteur>
  >({
    prenom: "",
    nom: "",
    siret: "",
    adresse: "",
    codePostal: "",
    ville: "",
    email: "",
    telephone: "",
    plaque: "",
  });
  const [newClientForm, setNewClientForm] = useState<Partial<Client>>({
    typeClient: "particulier",
    raisonSociale: "",
    prenom: "",
    nom: "",
    siret: "",
    telephone: "",
    plaques: [],
    chantiers: [],
    transporteurId: 0,
    tarifsPreferentiels: {},
  });
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printContent, setPrintContent] = useState("");
  const [printTitle, setPrintTitle] = useState("");
  const [validationErrors, setValidationErrors] = useState<{
    plaque?: boolean;
    nomEntreprise?: boolean;
    chantier?: boolean;
    produitId?: boolean;
  }>({});

  // Fonction pour vérifier si l'adresse client est complète
  const isClientAddressComplete = (client: Client): boolean => {
    return Boolean(
      client.adresse &&
        client.adresse.trim() !== "" &&
        client.codePostal &&
        client.codePostal.trim() !== "" &&
        client.ville &&
        client.ville.trim() !== ""
    );
  };

  // Fonction wrapper pour effacer les erreurs de validation
  const updateCurrentTabWithValidation = (
    updates: Partial<PeseeTab["formData"]>
  ) => {
    updateCurrentTab(updates);

    // Effacer les erreurs de validation quand l'utilisateur commence à remplir les champs
    const newErrors = { ...validationErrors };
    let hasChanges = false;

    if (updates.plaque && updates.plaque.trim() !== "") {
      newErrors.plaque = false;
      hasChanges = true;
    }

    if (updates.nomEntreprise && updates.nomEntreprise.trim() !== "") {
      newErrors.nomEntreprise = false;
      hasChanges = true;
    }

    if (updates.chantier && updates.chantier.trim() !== "") {
      newErrors.chantier = false;
      hasChanges = true;
    }

    if (updates.produitId && updates.produitId !== 0) {
      newErrors.produitId = false;
      hasChanges = true;
    }

    if (hasChanges) {
      setValidationErrors(newErrors);
    }
  };

  // Wrapper pour createNewTab asynchrone
  const handleCreateNewTab = async () => {
    try {
      await createNewTab();
    } catch (error) {
      console.error("Erreur lors de la création d'un nouvel onglet:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer un nouvel onglet.",
        variant: "destructive",
      });
    }
  };

  const generateNextClientCode = async (): Promise<string> => {
    try {
      // Récupérer tous les clients avec un codeClient
      const clientsWithCode = await db.clients
        .where("codeClient")
        .above("")
        .toArray();

      if (clientsWithCode.length === 0) {
        return normalizeClientCode("1"); // Premier client avec code normalisé
      }

      // Extraire les codes numériques et trouver le maximum
      const numericCodes = clientsWithCode
        .map((client) => {
          const code = client.codeClient || "";
          const match = code.match(/^(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((code) => code > 0);

      if (numericCodes.length === 0) {
        return normalizeClientCode("1"); // Aucun code numérique trouvé
      }

      const maxCode = Math.max(...numericCodes);
      return normalizeClientCode((maxCode + 1).toString());
    } catch (error) {
      console.error("Erreur lors de la génération du code client:", error);
      return normalizeClientCode("1"); // Valeur par défaut en cas d'erreur
    }
  };

  const prepareNewClientForm = async () => {
    const currentData = getCurrentTabData();

    // Générer le prochain code client
    const nextCode = await generateNextClientCode();

    if (currentData) {
      setNewClientForm({
        typeClient: currentData.typeClient || "particulier",
        codeClient: nextCode,
        raisonSociale: currentData.nomEntreprise || "",
        prenom:
          currentData.typeClient === "particulier"
            ? currentData.nomEntreprise || ""
            : "",
        nom: "",
        siret: "",
        telephone: "",
        plaques: currentData.plaque ? [currentData.plaque] : [],
        chantiers: currentData.chantier ? [currentData.chantier] : [],
        transporteurId: currentData.transporteurId || 0,
        tarifsPreferentiels: {},
      });
    }
    setIsAddClientDialogOpen(true);
  };

  const handleAddChantier = async () => {
    const currentData = getCurrentTabData();
    if (!currentData?.clientId || !newChantier.trim()) {
      toast({
        title: "Erreur",
        description:
          "Veuillez sélectionner un client et saisir un nom de chantier.",
        variant: "destructive",
      });
      return;
    }
    try {
      const client = clients.find((c) => c.id === currentData.clientId);
      if (client) {
        const updatedChantiers = [
          ...(client.chantiers || []),
          newChantier.trim(),
        ];
        await db.clients.update(client.id!, {
          chantiers: updatedChantiers,
        });
        updateCurrentTab({
          chantier: newChantier.trim(),
        });
        setNewChantier("");
        setIsAddChantierDialogOpen(false);
        toast({
          title: "Chantier ajouté",
          description: "Le nouveau chantier a été ajouté au client.",
        });
        loadData();
      }
    } catch (error) {
      console.error("Error adding chantier:", error);
    }
  };

  const handleAddNewClient = async () => {
    try {
      if (newClientForm.typeClient === "particulier") {
        if (!newClientForm.raisonSociale) {
          toast({
            title: "Erreur",
            description: "La raison sociale est obligatoire.",
            variant: "destructive",
          });
          return;
        }
      } else {
        if (!newClientForm.raisonSociale) {
          toast({
            title: "Erreur",
            description: "La raison sociale est obligatoire.",
            variant: "destructive",
          });
          return;
        }
      }

      const clientData = {
        ...newClientForm,
        raisonSociale: newClientForm.raisonSociale,
        telephone: newClientForm.telephone || "",
        plaques: newClientForm.plaques || [],
        chantiers: newClientForm.chantiers || [],
        transporteurId: newClientForm.transporteurId || 0,
        tarifsPreferentiels: newClientForm.tarifsPreferentiels || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Client;

      // Création d'un nouveau client uniquement
      const clientId = (await db.clients.add(clientData)) as number;

      updateCurrentTab({
        nomEntreprise: clientData.raisonSociale,
        clientId: clientId,
        typeClient: clientData.typeClient,
        plaque: clientData.plaques?.[0] || "",
        chantier: clientData.chantiers?.[0] || "",
        transporteurId: clientData.transporteurId || 0,
      });
      setIsAddClientDialogOpen(false);
      setNewClientForm({
        typeClient: "particulier",
        raisonSociale: "",
        prenom: "",
        nom: "",
        siret: "",
        telephone: "",
        plaques: [],
        chantiers: [],
        transporteurId: 0,
        tarifsPreferentiels: {},
      });
      toast({
        title: "Client ajouté",
        description: "Le nouveau client a été créé et sélectionné.",
      });
      loadData();
    } catch (error) {
      console.error("Error adding client:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le client.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateClient = async () => {
    try {
      if (!newClientForm.id) {
        toast({
          title: "Erreur",
          description: "Aucun client sélectionné pour la modification.",
          variant: "destructive",
        });
        return;
      }

      if (newClientForm.typeClient === "particulier") {
        if (!newClientForm.raisonSociale) {
          toast({
            title: "Erreur",
            description: "La raison sociale est obligatoire.",
            variant: "destructive",
          });
          return;
        }
      } else {
        if (!newClientForm.raisonSociale) {
          toast({
            title: "Erreur",
            description: "La raison sociale est obligatoire.",
            variant: "destructive",
          });
          return;
        }
      }

      const clientData = {
        ...newClientForm,
        raisonSociale: newClientForm.raisonSociale,
        telephone: newClientForm.telephone || "",
        plaques: newClientForm.plaques || [],
        chantiers: newClientForm.chantiers || [],
        transporteurId: newClientForm.transporteurId || 0,
        tarifsPreferentiels: newClientForm.tarifsPreferentiels || {},
        updatedAt: new Date(),
      } as Client;

      // Modification d'un client existant
      await db.clients.put(clientData);

      updateCurrentTab({
        nomEntreprise: clientData.raisonSociale,
        clientId: newClientForm.id,
        typeClient: clientData.typeClient,
        plaque: clientData.plaques?.[0] || "",
        chantier: clientData.chantiers?.[0] || "",
        transporteurId: clientData.transporteurId || 0,
      });
      setIsAddClientDialogOpen(false);
      setNewClientForm({
        typeClient: "particulier",
        raisonSociale: "",
        prenom: "",
        nom: "",
        siret: "",
        telephone: "",
        plaques: [],
        chantiers: [],
        transporteurId: 0,
        tarifsPreferentiels: {},
      });

      toast({
        title: "Client modifié",
        description: "Les informations du client ont été mises à jour.",
      });
    } catch (error) {
      console.error("Error updating client:", error);
      toast({
        title: "Erreur",
        description: `Erreur lors de la modification: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
        variant: "destructive",
      });
    }
  };

  const validateNewClient = (): boolean => {
    // Le code client est obligatoire
    if (
      !newClientForm.codeClient ||
      typeof newClientForm.codeClient !== "string" ||
      newClientForm.codeClient.trim() === ""
    ) {
      return false;
    }

    if (newClientForm.typeClient === "particulier") {
      return Boolean(newClientForm.raisonSociale);
    } else {
      if (!newClientForm.raisonSociale) return false;
      if (
        newClientForm.typeClient === "professionnel" &&
        !newClientForm.siret
      ) {
        return false;
      }
      return true;
    }
  };

  const validateNewTransporteur = (): boolean => {
    return Boolean(newTransporteurForm.prenom && newTransporteurForm.nom);
  };

  const handleAddNewTransporteur = async () => {
    if (!validateNewTransporteur()) return;
    try {
      const transporteurData = {
        ...newTransporteurForm,
        telephone: newTransporteurForm.telephone || "",
        plaque: newTransporteurForm.plaque || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Transporteur;
      const id = await db.transporteurs.add(transporteurData);
      await loadData();
      await loadTransporteurs();

      // Sélectionner le nouveau transporteur
      updateCurrentTab({
        transporteurId: id as number,
      });
      toast({
        title: "Transporteur créé",
        description: "Le transporteur a été créé et sélectionné avec succès.",
      });
      setIsAddTransporteurDialogOpen(false);
      setNewTransporteurForm({
        prenom: "",
        nom: "",
        siret: "",
        adresse: "",
        codePostal: "",
        ville: "",
        email: "",
        telephone: "",
        plaque: "",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le transporteur.",
        variant: "destructive",
      });
    }
  };

  const handleSaveOnly = async () => {
    await savePesee();
    setIsSaveDialogOpen(false);
  };

  const handleSaveAndPrint = async () => {
    const success = await savePesee();
    if (success) {
      const currentData = getCurrentTabData();
      if (currentData) {
        const content = await handlePrint(
          currentData,
          products,
          transporteurs,
          false
        );
        setPrintContent(content);
        setPrintTitle("Bon de pesée");
        setPrintPreviewOpen(true);
      }
    }
    setIsSaveDialogOpen(false);
  };

  const handleSaveAndPrintInvoice = async () => {
    const success = await savePesee();
    if (success) {
      const currentData = getCurrentTabData();
      if (currentData && currentData.clientId) {
        // Récupérer les données client depuis la base
        const client = clients.find((c) => c.id === currentData.clientId);
        if (client) {
          const { generateInvoiceContent } = await import(
            "@/utils/invoiceUtils"
          );
          const invoiceContent = await generateInvoiceContent(
            currentData,
            products,
            transporteurs,
            client
          );
          setPrintContent(invoiceContent);
          setPrintTitle("Facture");
          setPrintPreviewOpen(true);
        }
      }
    }
    setIsSaveDialogOpen(false);
  };

  const handleSavePrintBonAndInvoice = async () => {
    const success = await savePesee();
    if (success) {
      const currentData = getCurrentTabData();
      if (currentData && currentData.clientId) {
        // Récupérer les données client depuis la base
        const client = clients.find((c) => c.id === currentData.clientId);
        if (client) {
          const { bonContent } = await handlePrintBothBonAndInvoice(
            currentData,
            products,
            transporteurs,
            client
          );
          setPrintContent(bonContent);
          setPrintTitle("Bon de pesée + Facture");
          setPrintPreviewOpen(true);
        } else {
          const { bonContent } = await handlePrintBothBonAndInvoice(
            currentData,
            products,
            transporteurs
          );
          setPrintContent(bonContent);
          setPrintTitle("Bon de pesée + Facture");
          setPrintPreviewOpen(true);
        }
      } else {
        const { bonContent } = await handlePrintBothBonAndInvoice(
          currentData,
          products,
          transporteurs
        );
        setPrintContent(bonContent);
        setPrintTitle("Bon de pesée + Facture");
        setPrintPreviewOpen(true);
      }
    }
    setIsSaveDialogOpen(false);
  };

  const savePesee = async (): Promise<boolean> => {
    const currentData = getCurrentTabData();

    // Réinitialiser les erreurs de validation
    setValidationErrors({});

    try {
      // Vérifier les champs obligatoires et marquer les erreurs
      const errors: typeof validationErrors = {};
      let hasErrors = false;

      if (!currentData?.plaque || currentData.plaque.trim() === "") {
        errors.plaque = true;
        hasErrors = true;
      }

      if (
        !currentData?.nomEntreprise ||
        currentData.nomEntreprise.trim() === ""
      ) {
        errors.nomEntreprise = true;
        hasErrors = true;
      }

      if (!currentData?.produitId || currentData.produitId === 0) {
        errors.produitId = true;
        hasErrors = true;
      }

      if (hasErrors) {
        setValidationErrors(errors);
        toast({
          title: "Erreur",
          description:
            "Veuillez remplir tous les champs obligatoires marqués en rouge.",
          variant: "destructive",
        });
        return false;
      }

      // Vérification du chantier obligatoire avec suggestion automatique
      if (!currentData?.chantier || currentData.chantier.trim() === "") {
        errors.chantier = true;
        setValidationErrors(errors);

        // Essayer de suggérer l'adresse du client
        if (currentData.clientId) {
          const client = clients.find((c) => c.id === currentData.clientId);
          if (client && isClientAddressComplete(client)) {
            // Suggérer l'adresse complète
            const suggestedChantier = `${client.adresse}, ${client.codePostal} ${client.ville}`;

            // Auto-remplir avec la suggestion
            updateCurrentTab({ chantier: suggestedChantier });

            toast({
              title: "Chantier suggéré automatiquement",
              description:
                "Chantier suggéré à partir de l'adresse principale du client. Vous pouvez le remplacer si nécessaire.",
              variant: "default",
            });

            return false; // Empêcher la sauvegarde pour permettre à l'utilisateur de vérifier
          } else {
            // Le client n'a pas d'adresse complète
            const client = clients.find((c) => c.id === currentData.clientId);
            const hasPartialAddress =
              client && (client.adresse || client.codePostal || client.ville);

            toast({
              title: "Chantier obligatoire",
              description: hasPartialAddress
                ? "Impossible de valider la pesée : aucun chantier sélectionné et adresse client incomplète. Complétez l'adresse du client ou sélectionnez un chantier existant."
                : "Impossible de valider la pesée : aucun chantier sélectionné et aucune adresse client disponible. Ajoutez une adresse au client ou sélectionnez un chantier existant.",
              variant: "destructive",
            });
            return false;
          }
        } else {
          // Pas de client sélectionné
          toast({
            title: "Chantier obligatoire",
            description:
              "Le chantier est obligatoire pour valider la pesée. Veuillez en sélectionner un.",
            variant: "destructive",
          });
          return false;
        }
      }

      // Validation finale côté serveur - aucune pesée ne peut être sauvegardée sans chantier
      if (!currentData?.chantier || currentData.chantier.trim() === "") {
        toast({
          title: "Erreur de validation",
          description:
            "Le chantier est obligatoire pour sauvegarder une pesée.",
          variant: "destructive",
        });
        return false;
      }

      const selectedProduct = products.find(
        (p) => p.id === currentData.produitId
      );
      if (!selectedProduct) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un produit.",
          variant: "destructive",
        });
        return false;
      }

      // Convertir les poids en tonnes (pas de division par 1000 car déjà en tonnes)
      const poidsEntree =
        parseFloat(currentData.poidsEntree.replace(",", ".")) || 0;
      const poidsSortie =
        parseFloat(currentData.poidsSortie.replace(",", ".")) || 0;
      const net = Math.abs(poidsEntree - poidsSortie);

      // Utiliser le tarif standard par défaut
      let prixHT = selectedProduct.prixHT;
      let prixTTC = selectedProduct.prixTTC;

      // Appliquer le tarif préférentiel UNIQUEMENT si :
      // 1. Un client est sélectionné (clientId existe)
      // 2. Le client existe en base de données
      // 3. Ce client a des tarifs préférentiels définis
      // 4. Ce client a un tarif préférentiel pour ce produit spécifique
      if (currentData.clientId) {
        const client = clients.find((c) => c.id === currentData.clientId);
        if (
          client &&
          client.tarifsPreferentiels &&
          client.tarifsPreferentiels[currentData.produitId]
        ) {
          const tarifPref = client.tarifsPreferentiels[currentData.produitId];
          if (tarifPref.prixHT && tarifPref.prixTTC) {
            prixHT = tarifPref.prixHT;
            prixTTC = tarifPref.prixTTC;
            console.log(
              `Tarif préférentiel appliqué lors de la sauvegarde pour le client ${client.raisonSociale} - Produit ${selectedProduct.nom}: ${prixHT}€ HT`
            );
          }
        }
      }

      // Générer un numéro BL unique basé sur la BDD
      const uniqueNumeroBon = await generateUniqueBLNumber();

      const peseeData: Pesee = {
        ...currentData,
        numeroBon: uniqueNumeroBon, // Utiliser le numéro BL unique généré
        dateHeure: new Date(),
        poidsEntree,
        // déjà en tonnes
        poidsSortie,
        // déjà en tonnes
        net,
        // déjà en tonnes
        prixHT: net * prixHT,
        prixTTC: net * prixTTC,
        transporteurId: currentData.transporteurId || undefined,
        transporteurLibre: currentData.transporteurLibre || undefined, // Sauvegarder le transporteur libre
        typeClient: currentData.typeClient || "particulier",
        synchronized: false,
        version: 1,
        // Version initiale
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedPeseeId = await db.pesees.add(peseeData);

      // Vérifier Track Déchet automatique
      await checkAndGenerateTrackDechet(savedPeseeId, peseeData);

      toast({
        title: "Pesée enregistrée",
        description: `Bon n°${uniqueNumeroBon} créé avec succès.`,
      });
      updateCurrentTab({
        numeroBon: generateBonNumber(),
        moyenPaiement: "Direct",
        plaque: "",
        nomEntreprise: "",
        chantier: "",
        produitId: 0,
        poidsEntree: "",
        poidsSortie: "",
        clientId: 0,
        transporteurId: 0,
        transporteurLibre: "",
        typeClient: "particulier",
      });
      loadData();
      return true;
    } catch (error) {
      console.error("Error saving pesee:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la pesée.",
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * Vérifie et génère automatiquement un BSD Track Déchet si nécessaire
   */
  const checkAndGenerateTrackDechet = async (
    savedPeseeId: number,
    peseeData: any
  ) => {
    try {
      // Trouver le produit
      const product = products.find((p) => p.id === peseeData.produitId);
      if (!product || !product.trackDechetEnabled || !product.codeDechets) {
        return; // Track Déchet non activé pour ce produit
      }

      // Récupérer client et transporteur
      const [client, transporteur] = await Promise.all([
        peseeData.clientId
          ? db.clients.get(peseeData.clientId)
          : Promise.resolve(null),
        peseeData.transporteurId
          ? db.transporteurs.get(peseeData.transporteurId)
          : Promise.resolve(null),
      ]);

      if (!client) {
        return; // Pas assez de données
      }

      // Vérifier si Track Déchet est applicable
      const fullPeseeData = { ...peseeData, id: savedPeseeId };
      const isApplicable = isTrackDechetApplicable(
        fullPeseeData,
        client,
        transporteur,
        product
      );

      if (isApplicable) {
        console.log(
          `🔄 Track Déchet applicable pour la pesée ${peseeData.numeroBon} - Ajout à la file de synchronisation`
        );

        // Ajouter à la file de synchronisation Track Déchet
        await trackDechetProcessor.addPeseeToQueue(
          savedPeseeId,
          client.id!,
          transporteur?.id || null,
          product.id!,
          product.codeDechets
        );

        toast({
          title: "📋 Track Déchet",
          description: "BSD programmé pour génération automatique",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la vérification Track Déchet:", error);
    }
  };

  const currentData = getCurrentTabData();
  return (
    <div className="space-y-6">
      <div
        className="fixed top-0 right-0 bg-white z-10 shadow-lg transition-all duration-300"
        style={{
          left: "var(--sidebar-width, 4rem)",
          marginLeft: "auto",
        }}
      >
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold flex items-center text-gray-800">
            <Scale className="h-6 w-6 mr-3 text-black" />
            Station de Pesée
          </h1>
        </div>

        <div className="px-6 py-3 bg-white">
          <Tabs
            value={showRecentTab ? "recentes" : activeTabId}
            onValueChange={(value) => {
              if (value === "recentes") {
                setShowRecentTab(true);
              } else {
                setShowRecentTab(false);
                setActiveTabId(value);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <EnhancedTabs
                tabs={[
                  ...tabs.map((tab) => ({
                    id: tab.id,
                    label: getTabLabel(tab.id),
                    onClose: () => closeTab(tab.id),
                    closeable: tabs.length > 1,
                  })),
                  {
                    id: "recentes",
                    label: "📊 Pesées Récentes",
                    closeable: false,
                  },
                ]}
                activeTabId={showRecentTab ? "recentes" : activeTabId}
                onTabSelect={(tabId) => {
                  if (tabId === "recentes") {
                    setShowRecentTab(true);
                  } else {
                    setShowRecentTab(false);
                    setActiveTabId(tabId);
                  }
                }}
                onNewTab={handleCreateNewTab}
                maxVisibleTabs={5}
                className="flex-1"
              />
            </div>
          </Tabs>
        </div>
      </div>

      <div className="h-32 bg-transparent"></div>

      <Tabs
        value={showRecentTab ? "recentes" : activeTabId}
        onValueChange={(value) => {
          if (value === "recentes") {
            setShowRecentTab(true);
          } else {
            setShowRecentTab(false);
            setActiveTabId(value);
          }
        }}
      >
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
                <CardTitle className="text-lg text-gray-800">
                  Nouvelle Pesée - {getTabLabel(tab.id)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <PeseeFormSection
                  currentData={tab.formData}
                  clients={clients}
                  transporteurs={transporteurs}
                  updateCurrentTab={updateCurrentTabWithValidation}
                  onAddClient={prepareNewClientForm}
                  isAddClientDialogOpen={isAddClientDialogOpen}
                  setIsAddClientDialogOpen={setIsAddClientDialogOpen}
                  newClientForm={newClientForm}
                  setNewClientForm={setNewClientForm}
                  handleAddNewClient={handleAddNewClient}
                  handleUpdateClient={handleUpdateClient}
                  validateNewClient={validateNewClient}
                  isAddChantierDialogOpen={isAddChantierDialogOpen}
                  setIsAddChantierDialogOpen={setIsAddChantierDialogOpen}
                  newChantier={newChantier}
                  setNewChantier={setNewChantier}
                  handleAddChantier={handleAddChantier}
                  isAddTransporteurDialogOpen={isAddTransporteurDialogOpen}
                  setIsAddTransporteurDialogOpen={
                    setIsAddTransporteurDialogOpen
                  }
                  newTransporteurForm={newTransporteurForm}
                  setNewTransporteurForm={setNewTransporteurForm}
                  handleAddNewTransporteur={handleAddNewTransporteur}
                  validateNewTransporteur={validateNewTransporteur}
                  validationErrors={validationErrors}
                />

                <ProductWeightSection
                  currentData={tab.formData}
                  products={products}
                  updateCurrentTab={updateCurrentTabWithValidation}
                  validationErrors={validationErrors}
                />

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (tab.formData) {
                        const content = await handlePrint(
                          tab.formData,
                          products,
                          transporteurs,
                          false
                        );
                        setPrintContent(content);
                        setPrintTitle("Bon de pesée");
                        setPrintPreviewOpen(true);
                      }
                    }}
                    className="hover:bg-blue-50"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimer
                  </Button>
                  <Button
                    onClick={() => setIsSaveDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="recentes">
          <RecentPeseesTab
            pesees={pesees}
            products={products}
            transporteurs={transporteurs}
          />
        </TabsContent>
      </Tabs>

      <SaveConfirmDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onConfirm={handleSaveAndPrintInvoice}
        onConfirmAndPrint={handleSaveAndPrint}
        onConfirmPrintAndInvoice={handleSavePrintBonAndInvoice}
        moyenPaiement={currentData?.moyenPaiement || "ESP"}
      />

      {/* Print Preview Dialog */}
      <PrintPreviewDialog
        isOpen={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        content={printContent}
        title={printTitle}
      />
    </div>
  );
}
