import { useState, useEffect, useCallback, useRef } from "react";
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
import {
  handlePrint,
  handlePrintDirect,
  handlePrintBothBonAndInvoice,
  handlePrintDirectBoth,
} from "@/utils/peseeUtils";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import { trackDechetProcessor } from "@/utils/trackdechetSyncProcessor";
import { isTrackDechetApplicable } from "@/utils/trackdechetValidation";
import { normalizeClientCode } from "@/utils/clientCodeUtils";

interface PeseeSpaceProps {
  editingRequest?: { id: number; nonce: number } | null;
  onEditHandled?: () => void;
}

export default function PeseeSpace({
  editingRequest,
  onEditHandled,
}: PeseeSpaceProps = {}) {
  const { toast } = useToast();
  const { pesees, clients, products, loadData } = usePeseeData();
  const { transporteurs, loadTransporteurs } = useTransporteurData();
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    createNewTab,
    createEditTab,
    closeTab,
    updateCurrentTab,
    getCurrentTabData,
    generateBonNumber,
    generateUniqueBLNumber,
    generateNextFANumber,
    generateUniqueFANumber,
    getMaxSequenceNumber,
    getTabLabel,
  } = usePeseeTabs();
  const [showRecentTab, setShowRecentTab] = useState(false);
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [isAddChantierDialogOpen, setIsAddChantierDialogOpen] = useState(false);
  const [isAddPlaqueDialogOpen, setIsAddPlaqueDialogOpen] = useState(false);
  const [isAddTransporteurDialogOpen, setIsAddTransporteurDialogOpen] =
    useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [newChantier, setNewChantier] = useState("");
  const [newPlaque, setNewPlaque] = useState("");
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
  const [printContent, setPrintContent] = useState<string>("");
  const [printTitle, setPrintTitle] = useState<string>(
    "Aperçu avant impression"
  );
  const [validationErrors, setValidationErrors] = useState<{
    plaque?: boolean;
    nomEntreprise?: boolean;
    chantier?: boolean;
    produitId?: boolean;
    poidsEntree?: boolean;
    poidsSortie?: boolean;
  }>({});
  const [editingPeseeId, setEditingPeseeId] = useState<number | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const isEditingInProgressRef = useRef(false);

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

  // Charger une pesée en mode édition
  const loadPeseeForEdit = useCallback(
    async (peseeId: number) => {
      // Vérifier si une édition est déjà en cours pour éviter les onglets multiples
      if (isEditingInProgressRef.current || editingTabId) {
        console.log(
          "[loadPeseeForEdit] Une édition est déjà en cours, on ignore cette demande"
        );
        return;
      }

      // Marquer qu'une édition est en cours
      isEditingInProgressRef.current = true;

      try {
        const pesee = await db.pesees.get(peseeId);
        if (!pesee) {
          toast({
            title: "Erreur",
            description: "Pesée introuvable.",
            variant: "destructive",
          });
          onEditHandled?.();
          return;
        }

        // Vérifier si la pesée a déjà été exportée
        const isExported =
          (pesee.exportedAt && pesee.exportedAt.length > 0) ||
          pesee.numeroBonExported ||
          pesee.numeroFactureExported;

        if (isExported) {
          toast({
            title: "Modification impossible",
            description:
              "Cette pesée a déjà été exportée et ne peut plus être modifiée.",
            variant: "destructive",
          });
          onEditHandled?.();
          return;
        }

        // Créer systématiquement un nouvel onglet pour l'édition au début de la liste
        const formDataForEdit = {
          numeroBon: pesee.numeroBon || "",
          numeroFacture: pesee.numeroFacture || "",
          nomEntreprise: pesee.nomEntreprise || "",
          plaque: pesee.plaque || "",
          chantier: pesee.chantier || "",
          chantierLibre: pesee.chantierLibre || "",
          produitId: pesee.produitId || 0,
          transporteurId: pesee.transporteurId || 0,
          transporteurLibre: pesee.transporteurLibre || "",
          poidsEntree: pesee.poidsEntree?.toString() || "",
          poidsSortie: pesee.poidsSortie?.toString() || "",
          moyenPaiement:
            (pesee.moyenPaiement as "ESP" | "CB" | "CHQ" | "VIR" | "PRVT") ||
            "ESP",
          typeClient: pesee.typeClient || "professionnel",
          clientId: pesee.clientId || 0,
        };

        const newTabId = createEditTab(
          formDataForEdit,
          pesee.nomEntreprise || ""
        );

        if (!newTabId) {
          throw new Error(
            "Impossible de créer un nouvel onglet pour l'édition"
          );
        }

        // S'assurer que le nouvel onglet est actif (createEditTab le fait déjà, mais on le confirme)
        setActiveTabId(newTabId);

        setEditingPeseeId(peseeId);
        setEditingTabId(newTabId);
        onEditHandled?.();
      } catch (error) {
        console.error("Erreur lors du chargement de la pesée:", error);
        // Nettoyer les états d'édition en cas d'erreur
        setEditingPeseeId(null);
        setEditingTabId(null);
        isEditingInProgressRef.current = false;
        toast({
          title: "Erreur",
          description: "Impossible de charger la pesée pour modification.",
          variant: "destructive",
        });
        onEditHandled?.();
      } finally {
        // Réinitialiser le flag après un court délai pour permettre la mise à jour de l'état
        setTimeout(() => {
          isEditingInProgressRef.current = false;
        }, 100);
      }
    },
    [
      toast,
      onEditHandled,
      editingTabId,
      createEditTab,
      setEditingPeseeId,
      setEditingTabId,
      setActiveTabId,
    ]
  );

  // useEffect pour charger la pesée quand editingRequest change
  useEffect(() => {
    if (editingRequest?.id && !isEditingInProgressRef.current) {
      loadPeseeForEdit(editingRequest.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingRequest?.id, editingRequest?.nonce]); // Retirer loadPeseeForEdit des dépendances pour éviter les appels multiples

  // useEffect pour initialiser DECHETS VERTS sur le premier onglet après chargement des produits
  useEffect(() => {
    const initializeDefaultProduct = async () => {
      if (tabs.length > 0 && products.length > 0) {
        const currentTab = tabs.find((t) => t.id === activeTabId);
        if (currentTab && currentTab.formData.produitId === 0) {
          // Rechercher DECHETS VERTS
          let defaultProduitId = 0;
          const dechetsVerts = products.find(
            (p) => p.nom.toUpperCase() === "DECHETS VERT"
          );

          if (dechetsVerts && dechetsVerts.id) {
            defaultProduitId = dechetsVerts.id;
          } else {
            // Si pas trouvé, chercher le premier produit favori
            const firstFavorite = products.find((p) => p.isFavorite === true);
            if (firstFavorite && firstFavorite.id) {
              defaultProduitId = firstFavorite.id;
            } else {
              // Si pas de favori, prendre le premier produit de la liste
              if (products.length > 0 && products[0].id) {
                defaultProduitId = products[0].id;
              }
            }
          }

          if (defaultProduitId > 0) {
            updateCurrentTab({ produitId: defaultProduitId });
          }
        }
      }
    };

    initializeDefaultProduct();
  }, [products, tabs, activeTabId, updateCurrentTab]);

  // Wrapper pour createNewTab asynchrone
  const handleCreateNewTab = async () => {
    try {
      // Réinitialiser le mode édition si on crée un nouvel onglet
      setEditingPeseeId(null);
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
        typeClient: currentData.typeClient || "professionnel",
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
        // Récupérer le client complet depuis la DB pour être sûr d'avoir toutes les données
        const fullClient = await db.clients.get(client.id!);
        if (!fullClient) {
          toast({
            title: "Erreur",
            description: "Client introuvable.",
            variant: "destructive",
          });
          return;
        }

        const updatedChantiers = [
          ...(fullClient.chantiers || []),
          newChantier.trim(),
        ];

        // Mettre à jour avec put pour garantir la persistance
        await db.clients.put({
          ...fullClient,
          chantiers: updatedChantiers,
          updatedAt: new Date(),
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
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le chantier.",
        variant: "destructive",
      });
    }
  };

  const handleAddPlaque = async () => {
    const currentData = getCurrentTabData();
    if (!currentData?.clientId || !newPlaque.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un client et saisir une plaque.",
        variant: "destructive",
      });
      return;
    }
    try {
      const client = clients.find((c) => c.id === currentData.clientId);
      if (client) {
        // Récupérer le client complet depuis la DB pour être sûr d'avoir toutes les données
        const fullClient = await db.clients.get(client.id!);
        if (!fullClient) {
          toast({
            title: "Erreur",
            description: "Client introuvable.",
            variant: "destructive",
          });
          return;
        }

        const updatedPlaques = [
          ...(fullClient.plaques || []),
          newPlaque.trim(),
        ];

        // Mettre à jour avec put pour garantir la persistance
        await db.clients.put({
          ...fullClient,
          plaques: updatedPlaques,
          updatedAt: new Date(),
        });

        updateCurrentTab({
          plaque: newPlaque.trim(),
        });
        setNewPlaque("");
        setIsAddPlaqueDialogOpen(false);
        toast({
          title: "Plaque ajoutée",
          description: "La nouvelle plaque a été ajoutée au client.",
        });
        loadData();
      }
    } catch (error) {
      console.error("Error adding plaque:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la plaque.",
        variant: "destructive",
      });
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

      // Récupérer le client complet depuis la DB pour garantir toutes les données
      const fullClient = await db.clients.get(newClientForm.id);
      if (!fullClient) {
        toast({
          title: "Erreur",
          description: "Client introuvable.",
          variant: "destructive",
        });
        return;
      }

      const clientData = {
        ...fullClient,
        ...newClientForm,
        raisonSociale: newClientForm.raisonSociale,
        telephone: newClientForm.telephone || "",
        plaques: newClientForm.plaques || [],
        chantiers: newClientForm.chantiers || [],
        transporteurId: newClientForm.transporteurId || 0,
        tarifsPreferentiels: newClientForm.tarifsPreferentiels || {},
        id: newClientForm.id,
        updatedAt: new Date(),
      } as Client;

      // Modification d'un client existant avec put pour garantir la persistance
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

  const handleSaveOnly = async (
    typeDocument: "bon_livraison" | "facture" | "les_deux" = "bon_livraison"
  ) => {
    // Capturer l'ID de l'onglet actif AVANT la sauvegarde
    const currentTabId = activeTabId;
    // Vérifier si c'était le dernier onglet avant la sauvegarde
    const wasLastTab = tabs.length === 1;

    const result = await savePesee(typeDocument);
    setIsSaveDialogOpen(false);

    if (result && result.savedPeseeId) {
      // Réinitialiser les états d'édition
      setEditingPeseeId(null);
      setEditingTabId(null);
      isEditingInProgressRef.current = false;

      if (wasLastTab) {
        // Créer le nouvel onglet AVANT de fermer l'ancien pour éviter une page blanche
        const newTabId = await createNewTab();
        // Maintenant fermer l'ancien onglet (le nouvel onglet reste actif)
        if (currentTabId) {
          closeTab(currentTabId);
        }
        // S'assurer que le nouvel onglet est bien actif
        if (newTabId) {
          setActiveTabId(newTabId);
        }
      } else {
        // Si ce n'était pas le dernier onglet, fermer normalement
        if (currentTabId) {
          closeTab(currentTabId);
        }
      }
    }
  };

  const handleSaveAndPrint = async (
    typeDocument: "bon_livraison" | "facture" | "les_deux" = "bon_livraison"
  ) => {
    console.log("[handleSaveAndPrint] Début, typeDocument:", typeDocument);
    // Capturer l'ID de l'onglet actif AVANT la sauvegarde
    const currentTabId = activeTabId;
    // Vérifier si c'était le dernier onglet avant la sauvegarde
    const wasLastTab = tabs.length === 1;

    const result = await savePesee(typeDocument);
    console.log("[handleSaveAndPrint] result:", result);
    if (result && result.savedPeseeId) {
      const savedPeseeId = result.savedPeseeId;
      try {
        // Récupérer la pesée sauvegardée depuis la DB
        const savedPesee = await db.pesees.get(savedPeseeId);
        console.log("[handleSaveAndPrint] savedPesee récupérée:", savedPesee);
        if (savedPesee) {
          // Récupérer le client si c'est une facture
          const client = savedPesee.clientId
            ? clients.find((c) => c.id === savedPesee.clientId) || null
            : null;

          // Créer formDataForPrint à partir de la pesée sauvegardée
          const formDataForPrint: PeseeTab["formData"] = {
            numeroBon: savedPesee.numeroBon,
            numeroFacture: savedPesee.numeroFacture,
            nomEntreprise: savedPesee.nomEntreprise,
            plaque: savedPesee.plaque,
            chantier: savedPesee.chantier || savedPesee.chantierLibre || "",
            chantierLibre: savedPesee.chantierLibre,
            produitId: savedPesee.produitId,
            poidsEntree: savedPesee.poidsEntree.toString(),
            poidsSortie: savedPesee.poidsSortie.toString(),
            moyenPaiement: savedPesee.moyenPaiement as
              | "ESP"
              | "CB"
              | "CHQ"
              | "VIR"
              | "PRVT",
            clientId: savedPesee.clientId || 0,
            transporteurId: savedPesee.transporteurId || 0,
            transporteurLibre: savedPesee.transporteurLibre || "",
            typeClient: savedPesee.typeClient,
          };

          // Déterminer si c'est une facture ou un bon de livraison
          const isInvoice = typeDocument === "facture";

          // Ouvrir directement la fenêtre d'impression du navigateur
          console.log(
            `[handleSaveAndPrint] Appel handlePrintDirect avec isInvoice=${isInvoice}...`
          );
          await handlePrintDirect(
            formDataForPrint,
            products,
            transporteurs,
            isInvoice,
            client
          );
          console.log("[handleSaveAndPrint] Fenêtre d'impression ouverte");

          // Réinitialiser les états d'édition
          setEditingPeseeId(null);
          setEditingTabId(null);
          isEditingInProgressRef.current = false;

          if (wasLastTab) {
            // Créer le nouvel onglet AVANT de fermer l'ancien pour éviter une page blanche
            const newTabId = await createNewTab();
            // Maintenant fermer l'ancien onglet (le nouvel onglet reste actif)
            if (currentTabId) {
              closeTab(currentTabId);
            }
            // S'assurer que le nouvel onglet est bien activé
            if (newTabId) {
              setActiveTabId(newTabId);
            }
          } else {
            // Si ce n'était pas le dernier onglet, fermer normalement
            if (currentTabId) {
              closeTab(currentTabId);
            }
          }
        } else {
          console.error(
            "[handleSaveAndPrint] ERREUR: savedPesee est null/undefined"
          );
          toast({
            title: "Erreur",
            description: "Impossible de récupérer la pesée sauvegardée.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error(
          "[handleSaveAndPrint] ERREUR lors de la récupération/impression:",
          error
        );
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de l'impression.",
          variant: "destructive",
        });
      }
    } else {
      console.warn(
        "[handleSaveAndPrint] ATTENTION: result est null, la pesée n'a pas été sauvegardée"
      );
    }
    setIsSaveDialogOpen(false);
  };

  const handleSaveAndPrintInvoice = async (
    typeDocument: "bon_livraison" | "facture" | "les_deux" = "facture"
  ) => {
    console.log(
      "[handleSaveAndPrintInvoice] Début, typeDocument:",
      typeDocument
    );
    // Capturer l'ID de l'onglet actif AVANT la sauvegarde
    const currentTabId = activeTabId;
    // Vérifier si c'était le dernier onglet avant la sauvegarde
    const wasLastTab = tabs.length === 1;

    const result = await savePesee(typeDocument);
    console.log("[handleSaveAndPrintInvoice] result:", result);
    if (result && result.savedPeseeId) {
      const savedPeseeId = result.savedPeseeId;
      try {
        // Récupérer la pesée sauvegardée depuis la DB
        const savedPesee = await db.pesees.get(savedPeseeId);
        console.log(
          "[handleSaveAndPrintInvoice] savedPesee récupérée:",
          savedPesee
        );
        if (savedPesee) {
          // Récupérer le client
          const client = savedPesee.clientId
            ? clients.find((c) => c.id === savedPesee.clientId) || null
            : null;
          // Créer formDataForPrint à partir de la pesée sauvegardée
          const formDataForPrint: PeseeTab["formData"] = {
            numeroBon: savedPesee.numeroBon,
            numeroFacture: savedPesee.numeroFacture,
            nomEntreprise: savedPesee.nomEntreprise,
            plaque: savedPesee.plaque,
            chantier: savedPesee.chantier || savedPesee.chantierLibre || "",
            chantierLibre: savedPesee.chantierLibre,
            produitId: savedPesee.produitId,
            poidsEntree: savedPesee.poidsEntree.toString(),
            poidsSortie: savedPesee.poidsSortie.toString(),
            moyenPaiement: savedPesee.moyenPaiement as
              | "ESP"
              | "CB"
              | "CHQ"
              | "VIR"
              | "PRVT",
            clientId: savedPesee.clientId || 0,
            transporteurId: savedPesee.transporteurId || 0,
            transporteurLibre: savedPesee.transporteurLibre || "",
            typeClient: savedPesee.typeClient,
            reference: savedPesee.reference || "",
          };
          // Ouvrir directement la fenêtre d'impression du navigateur
          console.log("[handleSaveAndPrintInvoice] Appel handlePrintDirect...");
          await handlePrintDirect(
            formDataForPrint,
            products,
            transporteurs,
            true,
            client
          );
          console.log(
            "[handleSaveAndPrintInvoice] Fenêtre d'impression ouverte"
          );

          // Réinitialiser les états d'édition
          setEditingPeseeId(null);
          setEditingTabId(null);
          isEditingInProgressRef.current = false;

          if (wasLastTab) {
            // Créer le nouvel onglet AVANT de fermer l'ancien pour éviter une page blanche
            const newTabId = await createNewTab();
            // Maintenant fermer l'ancien onglet (le nouvel onglet reste actif)
            if (currentTabId) {
              closeTab(currentTabId);
            }
            // S'assurer que le nouvel onglet est bien activé
            if (newTabId) {
              setActiveTabId(newTabId);
            }
          } else {
            // Si ce n'était pas le dernier onglet, fermer normalement
            if (currentTabId) {
              closeTab(currentTabId);
            }
          }
        } else {
          console.error(
            "[handleSaveAndPrintInvoice] ERREUR: savedPesee est null/undefined"
          );
          toast({
            title: "Erreur",
            description: "Impossible de récupérer la pesée sauvegardée.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error(
          "[handleSaveAndPrintInvoice] ERREUR lors de la récupération/impression:",
          error
        );
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de l'impression.",
          variant: "destructive",
        });
      }
    } else {
      console.warn(
        "[handleSaveAndPrintInvoice] ATTENTION: result est null, la pesée n'a pas été sauvegardée"
      );
    }
    setIsSaveDialogOpen(false);
  };

  const handleSavePrintBonAndInvoice = async (
    typeDocument: "bon_livraison" | "facture" | "les_deux" = "les_deux"
  ) => {
    console.log(
      "[handleSavePrintBonAndInvoice] Début, typeDocument:",
      typeDocument
    );
    // Capturer l'ID de l'onglet actif AVANT la sauvegarde
    const currentTabId = activeTabId;
    // Vérifier si c'était le dernier onglet avant la sauvegarde
    const wasLastTab = tabs.length === 1;

    const result = await savePesee(typeDocument);
    console.log("[handleSavePrintBonAndInvoice] result:", result);
    if (result && result.savedPeseeId) {
      const savedPeseeId = result.savedPeseeId;
      try {
        // Récupérer la pesée sauvegardée depuis la DB
        const savedPesee = await db.pesees.get(savedPeseeId);
        console.log(
          "[handleSavePrintBonAndInvoice] savedPesee récupérée:",
          savedPesee
        );
        if (savedPesee) {
          // Récupérer le client
          const client = savedPesee.clientId
            ? clients.find((c) => c.id === savedPesee.clientId) || null
            : null;
          // Créer formDataForPrint à partir de la pesée sauvegardée
          const formDataForPrint: PeseeTab["formData"] = {
            numeroBon: savedPesee.numeroBon,
            numeroFacture: savedPesee.numeroFacture,
            nomEntreprise: savedPesee.nomEntreprise,
            plaque: savedPesee.plaque,
            chantier: savedPesee.chantier || savedPesee.chantierLibre || "",
            chantierLibre: savedPesee.chantierLibre,
            produitId: savedPesee.produitId,
            poidsEntree: savedPesee.poidsEntree.toString(),
            poidsSortie: savedPesee.poidsSortie.toString(),
            moyenPaiement: savedPesee.moyenPaiement as
              | "ESP"
              | "CB"
              | "CHQ"
              | "VIR"
              | "PRVT",
            clientId: savedPesee.clientId || 0,
            transporteurId: savedPesee.transporteurId || 0,
            transporteurLibre: savedPesee.transporteurLibre || "",
            typeClient: savedPesee.typeClient,
            reference: savedPesee.reference || "",
          };
          // Ouvrir directement la fenêtre d'impression du navigateur
          console.log(
            "[handleSavePrintBonAndInvoice] Appel handlePrintDirectBoth..."
          );
          await handlePrintDirectBoth(
            formDataForPrint,
            products,
            transporteurs,
            client
          );
          console.log(
            "[handleSavePrintBonAndInvoice] Fenêtre d'impression ouverte"
          );

          // Réinitialiser les états d'édition
          setEditingPeseeId(null);
          setEditingTabId(null);
          isEditingInProgressRef.current = false;

          if (wasLastTab) {
            // Créer le nouvel onglet AVANT de fermer l'ancien pour éviter une page blanche
            const newTabId = await createNewTab();
            // Maintenant fermer l'ancien onglet (le nouvel onglet reste actif)
            if (currentTabId) {
              closeTab(currentTabId);
            }
            // S'assurer que le nouvel onglet est bien activé
            if (newTabId) {
              setActiveTabId(newTabId);
            }
          } else {
            // Si ce n'était pas le dernier onglet, fermer normalement
            if (currentTabId) {
              closeTab(currentTabId);
            }
          }
        } else {
          console.error(
            "[handleSavePrintBonAndInvoice] ERREUR: savedPesee est null/undefined"
          );
          toast({
            title: "Erreur",
            description: "Impossible de récupérer la pesée sauvegardée.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error(
          "[handleSavePrintBonAndInvoice] ERREUR lors de la récupération/impression:",
          error
        );
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de l'impression.",
          variant: "destructive",
        });
      }
    } else {
      console.warn(
        "[handleSavePrintBonAndInvoice] ATTENTION: result est null, la pesée n'a pas été sauvegardée"
      );
    }
    setIsSaveDialogOpen(false);
  };

  const savePesee = async (
    typeDocument: "bon_livraison" | "facture" | "les_deux" = "bon_livraison"
  ): Promise<{ savedPeseeId: number; mode: "creation" | "edition" } | null> => {
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
        return null;
      }

      // Déterminer le chantier à utiliser (chantierLibre en priorité, sinon chantier)
      const chantierToUse =
        currentData?.chantierLibre?.trim() ||
        currentData?.chantier?.trim() ||
        "";

      // Vérification du chantier obligatoire avec suggestion automatique
      if (!chantierToUse) {
        errors.chantier = true;
        setValidationErrors(errors);

        // Essayer de suggérer l'adresse du client
        if (currentData.clientId) {
          const client = clients.find((c) => c.id === currentData.clientId);
          if (client && isClientAddressComplete(client)) {
            // Suggérer l'adresse complète
            const suggestedChantier = `${client.adresse}, ${client.codePostal} ${client.ville}`;

            // Auto-remplir avec la suggestion
            updateCurrentTab({
              chantier: suggestedChantier,
              chantierLibre: "",
            });

            toast({
              title: "Chantier suggéré automatiquement",
              description:
                "Chantier suggéré à partir de l'adresse principale du client. Vous pouvez le remplacer si nécessaire.",
              variant: "default",
            });

            return null; // Empêcher la sauvegarde pour permettre à l'utilisateur de vérifier
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
            return null;
          }
        } else {
          // Pas de client sélectionné
          toast({
            title: "Chantier obligatoire",
            description:
              "Le chantier est obligatoire pour valider la pesée. Veuillez en sélectionner un.",
            variant: "destructive",
          });
          return null;
        }
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
        return null;
      }

      // Validation : les poids doivent être remplis
      if (!currentData.poidsEntree || currentData.poidsEntree.trim() === "") {
        errors.poidsEntree = true;
        hasErrors = true;
      }

      if (!currentData.poidsSortie || currentData.poidsSortie.trim() === "") {
        errors.poidsSortie = true;
        hasErrors = true;
      }

      if (hasErrors) {
        setValidationErrors(errors);
        toast({
          title: "Erreur",
          description: "Les poids d'entrée et de sortie sont obligatoires.",
          variant: "destructive",
        });
        return null;
      }

      // Convertir les poids en tonnes (après validation)
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

      // Calculs totaux alignés avec l'UI (taxes sur HT + TVA produit + TVA des taxes)
      const totalHT = net * prixHT;
      let totalTTC: number;
      try {
        const activeTaxes = (await db.taxes.toArray()).filter((t) => t.active);
        const taxesHT = activeTaxes.reduce(
          (sum, tax) => sum + totalHT * (tax.taux / 100),
          0
        );
        const tauxTVAProduit = selectedProduct.tauxTVA || 20;
        const montantTVAProduit = totalHT * (tauxTVAProduit / 100);
        const montantTVATaxes = activeTaxes.reduce(
          (sum, tax) =>
            sum + totalHT * (tax.taux / 100) * ((tax.tauxTVA ?? 20) / 100),
          0
        );
        totalTTC = totalHT + taxesHT + montantTVAProduit + montantTVATaxes;
      } catch {
        // Fallback si lecture des taxes échoue: TTC basé sur PU TTC
        totalTTC = net * prixTTC;
      }

      // Vérifier si on est en mode édition
      const isEditing = editingPeseeId !== null;
      let existingPesee: Pesee | undefined;

      if (isEditing) {
        existingPesee = await db.pesees.get(editingPeseeId);
        if (!existingPesee) {
          toast({
            title: "Erreur",
            description: "Pesée introuvable pour modification.",
            variant: "destructive",
          });
          return null;
        }

        // Vérifier si la pesée a déjà été exportée
        const isExported =
          (existingPesee.exportedAt && existingPesee.exportedAt.length > 0) ||
          existingPesee.numeroBonExported ||
          existingPesee.numeroFactureExported;

        if (isExported) {
          toast({
            title: "Modification impossible",
            description:
              "Cette pesée a déjà été exportée et ne peut plus être modifiée.",
            variant: "destructive",
          });
          return null;
        }
      }

      // Générer les numéros selon le type de document
      let numeroBon = "";
      let numeroFacture = "";

      if (isEditing && existingPesee) {
        // En mode édition, gérer les numéros selon le type de document existant et le nouveau type
        const existingType = existingPesee.typeDocument || "bon_livraison";

        // Conserver le numéro de bon s'il existe et n'est pas exporté
        if (existingPesee.numeroBon && !existingPesee.numeroBonExported) {
          numeroBon = existingPesee.numeroBon;
        } else if (existingPesee.numeroBon) {
          // Si exporté, conserver quand même
          numeroBon = existingPesee.numeroBon;
        }

        // Conserver le numéro de facture s'il existe et n'est pas exporté
        if (
          existingPesee.numeroFacture &&
          !existingPesee.numeroFactureExported
        ) {
          numeroFacture = existingPesee.numeroFacture;
        } else if (existingPesee.numeroFacture) {
          // Si exporté, conserver quand même
          numeroFacture = existingPesee.numeroFacture;
        }

        // Si on change le type de document, générer les numéros manquants
        if (typeDocument === "les_deux") {
          // Si on passe à "les_deux", s'assurer qu'on a les deux numéros
          if (!numeroBon) {
            // Si on n'a pas de numéro de bon, essayer d'utiliser le même numéro séquentiel que le FA
            if (numeroFacture && numeroFacture.startsWith("FA")) {
              const seqNum = parseInt(numeroFacture.substring(2));
              if (!isNaN(seqNum)) {
                numeroBon = `BL${seqNum}`;
                // Vérifier l'unicité croisée : si un BL avec ce numéro existe déjà dans une autre pesée
                const peseesWithBL = await db.pesees
                  .where("numeroBon")
                  .equals(numeroBon)
                  .toArray();
                const blExists = existingPesee?.id
                  ? peseesWithBL.some((p) => p.id !== existingPesee.id)
                  : peseesWithBL.length > 0;

                if (blExists) {
                  // Si le BL existe déjà dans une autre pesée, on doit incrémenter les deux numéros
                  // pour garder la cohérence BL+FA avec le même numéro séquentiel
                  let nextSeqNum = seqNum + 1;
                  let newBL = `BL${nextSeqNum}`;
                  let newFA = `FA${nextSeqNum}`;

                  // Vérifier que les nouveaux numéros sont disponibles
                  while (true) {
                    const blExists2 = (
                      await db.pesees.where("numeroBon").equals(newBL).toArray()
                    ).some((p) =>
                      existingPesee?.id ? p.id !== existingPesee.id : true
                    );
                    const faExists = (
                      await db.pesees
                        .where("numeroFacture")
                        .equals(newFA)
                        .toArray()
                    ).some((p) =>
                      existingPesee?.id ? p.id !== existingPesee.id : true
                    );

                    if (!blExists2 && !faExists) {
                      break; // Numéros disponibles
                    }
                    nextSeqNum++;
                    newBL = `BL${nextSeqNum}`;
                    newFA = `FA${nextSeqNum}`;
                  }

                  numeroBon = newBL;
                  numeroFacture = newFA;
                }
              } else {
                numeroBon = await generateUniqueBLNumber(existingPesee?.id);
              }
            } else {
              // Générer un BL unique en excluant la pesée courante (si en mode édition)
              numeroBon = await generateUniqueBLNumber(existingPesee?.id);
            }
          }
          if (!numeroFacture) {
            // Si on n'a pas de numéro de facture, essayer d'utiliser le même numéro séquentiel que le BL
            if (numeroBon && numeroBon.startsWith("BL")) {
              const seqNum = parseInt(numeroBon.substring(2));
              if (!isNaN(seqNum)) {
                numeroFacture = `FA${seqNum}`;
                // Vérifier l'unicité croisée : si un FA avec ce numéro existe déjà dans une autre pesée
                const peseesWithFA = await db.pesees
                  .where("numeroFacture")
                  .equals(numeroFacture)
                  .toArray();
                const faExists = existingPesee?.id
                  ? peseesWithFA.some((p) => p.id !== existingPesee.id)
                  : peseesWithFA.length > 0;

                if (faExists) {
                  // Si le FA existe déjà dans une autre pesée, on doit incrémenter les deux numéros
                  // pour garder la cohérence BL+FA avec le même numéro séquentiel
                  let nextSeqNum = seqNum + 1;
                  let newBL = `BL${nextSeqNum}`;
                  let newFA = `FA${nextSeqNum}`;

                  // Vérifier que les nouveaux numéros sont disponibles
                  while (true) {
                    const blExists = (
                      await db.pesees.where("numeroBon").equals(newBL).toArray()
                    ).some((p) =>
                      existingPesee?.id ? p.id !== existingPesee.id : true
                    );
                    const faExists2 = (
                      await db.pesees
                        .where("numeroFacture")
                        .equals(newFA)
                        .toArray()
                    ).some((p) =>
                      existingPesee?.id ? p.id !== existingPesee.id : true
                    );

                    if (!blExists && !faExists2) {
                      break; // Numéros disponibles
                    }
                    nextSeqNum++;
                    newBL = `BL${nextSeqNum}`;
                    newFA = `FA${nextSeqNum}`;
                  }

                  numeroBon = newBL;
                  numeroFacture = newFA;
                }
              } else {
                numeroFacture = await generateUniqueFANumber(existingPesee?.id);
              }
            } else {
              numeroFacture = await generateUniqueFANumber(existingPesee?.id);
            }
          }
        } else if (typeDocument === "bon_livraison") {
          // Si on passe à "bon_livraison" uniquement, s'assurer qu'on a un numéro de bon
          if (!numeroBon) {
            numeroBon = await generateUniqueBLNumber(existingPesee?.id);
          }
          // Pas de facture nécessaire
          numeroFacture = undefined;
        } else if (typeDocument === "facture") {
          // Si on passe à "facture" uniquement, s'assurer qu'on a un numéro de facture
          if (!numeroFacture) {
            numeroFacture = await generateUniqueFANumber(existingPesee?.id);
          }
          // Pas de bon nécessaire
          numeroBon = "";
        }
      } else {
        // Mode création : générer de nouveaux numéros
        if (typeDocument === "bon_livraison" || typeDocument === "les_deux") {
          if (typeDocument === "les_deux") {
            // Pour "les_deux", utiliser getMaxSequenceNumber pour éviter les conflits
            let nextSeqNum = await getMaxSequenceNumber();
            numeroBon = `BL${nextSeqNum}`;
            numeroFacture = `FA${nextSeqNum}`;

            // Vérifier l'unicité pour les deux numéros
            let blExists =
              (await db.pesees.where("numeroBon").equals(numeroBon).count()) >
              0;
            let faExists =
              (await db.pesees
                .where("numeroFacture")
                .equals(numeroFacture)
                .count()) > 0;

            while (blExists || faExists) {
              nextSeqNum++;
              numeroBon = `BL${nextSeqNum}`;
              numeroFacture = `FA${nextSeqNum}`;
              blExists =
                (await db.pesees.where("numeroBon").equals(numeroBon).count()) >
                0;
              faExists =
                (await db.pesees
                  .where("numeroFacture")
                  .equals(numeroFacture)
                  .count()) > 0;
            }
          } else {
            numeroBon = await generateUniqueBLNumber();
          }
        }

        if (typeDocument === "facture") {
          numeroFacture = await generateUniqueFANumber();
        }
      }

      const peseeData: Partial<Pesee> = {
        ...currentData,
        numeroBon: numeroBon || "", // Vide si seulement facture
        numeroFacture: numeroFacture || undefined,
        typeDocument,
        dateHeure:
          isEditing && existingPesee ? existingPesee.dateHeure : new Date(),
        poidsEntree,
        // déjà en tonnes
        poidsSortie,
        // déjà en tonnes
        net,
        // déjà en tonnes
        prixHT: totalHT,
        prixTTC: totalTTC,
        chantier: chantierToUse, // Utiliser chantierLibre en priorité, sinon chantier
        chantierLibre: currentData.chantierLibre || undefined, // Sauvegarder le chantier libre
        transporteurId: currentData.transporteurId || undefined,
        transporteurLibre: currentData.transporteurLibre || undefined, // Sauvegarder le transporteur libre
        typeClient: currentData.typeClient || "professionnel",
        synchronized: false,
        updatedAt: new Date(),
      };

      // En mode création, ajouter les champs initiaux
      if (!isEditing) {
        (peseeData as Pesee).version = 1;
        (peseeData as Pesee).numeroBonExported = false;
        (peseeData as Pesee).numeroFactureExported = false;
        (peseeData as Pesee).createdAt = new Date();
      } else {
        // En mode édition, conserver les valeurs existantes
        if (existingPesee) {
          peseeData.version = existingPesee.version || 1;
          peseeData.numeroBonExported = existingPesee.numeroBonExported;
          peseeData.numeroFactureExported = existingPesee.numeroFactureExported;
          peseeData.createdAt = existingPesee.createdAt;
          peseeData.exportedAt = existingPesee.exportedAt;
        }
      }

      let savedPeseeId: number;

      if (isEditing && editingPeseeId) {
        // Mise à jour de la pesée existante
        await db.pesees.update(editingPeseeId, peseeData);
        savedPeseeId = editingPeseeId;
      } else {
        // Création d'une nouvelle pesée
        savedPeseeId = await db.pesees.add(peseeData as Pesee);
      }

      // Vérifier Track Déchet automatique (seulement pour les nouvelles pesées)
      if (!isEditing) {
        await checkAndGenerateTrackDechet(savedPeseeId, peseeData as Pesee);
      }

      // Créer le message de succès selon le type de document
      let successMessage = "";
      if (isEditing) {
        if (typeDocument === "bon_livraison") {
          successMessage = `Bon de livraison n°${numeroBon} modifié avec succès.`;
        } else if (typeDocument === "facture") {
          successMessage = `Facture n°${numeroFacture} modifiée avec succès.`;
        } else {
          successMessage = `Bon de livraison n°${numeroBon} et Facture n°${numeroFacture} modifiés avec succès.`;
        }
      } else {
        if (typeDocument === "bon_livraison") {
          successMessage = `Bon de livraison n°${numeroBon} créé avec succès.`;
        } else if (typeDocument === "facture") {
          successMessage = `Facture n°${numeroFacture} créée avec succès.`;
        } else {
          successMessage = `Bon de livraison n°${numeroBon} et Facture n°${numeroFacture} créés avec succès.`;
        }
      }

      toast({
        title: isEditing ? "Pesée modifiée" : "Pesée enregistrée",
        description: successMessage,
      });

      loadData();

      // Retourner un objet structuré avec les informations nécessaires pour les handlers
      return {
        savedPeseeId,
        mode: isEditing ? ("edition" as const) : ("creation" as const),
      };
    } catch (error) {
      console.error("Error saving pesee:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la pesée.",
        variant: "destructive",
      });
      return null;
    }
  };

  /**
   * Vérifie et génère automatiquement un BSD Track Déchet si nécessaire
   */
  const checkAndGenerateTrackDechet = async (
    savedPeseeId: number,
    peseeData: Pesee
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

  // Fonction pour gérer la fermeture d'un onglet avec confirmation
  const handleCloseTab = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // Vérifier si c'est un onglet d'édition
    const isEditingTab = tabId === editingTabId;

    // Vérifier si l'onglet contient des données non sauvegardées
    const hasData =
      tab.formData.clientId > 0 ||
      tab.formData.produitId > 0 ||
      tab.formData.poidsEntree ||
      tab.formData.poidsSortie ||
      tab.formData.plaque ||
      tab.formData.nomEntreprise;

    if (hasData || isEditingTab) {
      // Afficher une confirmation
      const message = isEditingTab
        ? "Cet onglet contient une pesée en cours de modification. Êtes-vous sûr de vouloir le fermer ?"
        : "Cet onglet contient des données non sauvegardées. Êtes-vous sûr de vouloir le fermer ?";

      if (window.confirm(message)) {
        // Nettoyer les états d'édition si c'était un onglet d'édition
        if (isEditingTab) {
          setEditingPeseeId(null);
          setEditingTabId(null);
          isEditingInProgressRef.current = false;
        }
        closeTab(tabId);
      }
    } else {
      closeTab(tabId);
    }
  };

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
          <div className="flex items-center gap-3">
            {/* Zone des onglets - prend l'espace disponible */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <EnhancedTabs
                tabs={tabs.map((tab) => ({
                  id: tab.id,
                  label: getTabLabel(tab.id),
                  onClose: () => handleCloseTab(tab.id),
                  closeable: tabs.length > 1,
                  isEditing: tab.isEditing || false,
                }))}
                activeTabId={showRecentTab ? null : activeTabId}
                onTabSelect={(tabId) => {
                  setShowRecentTab(false);
                  setActiveTabId(tabId);
                }}
              />
            </div>

            {/* Boutons à droite - largeur fixe */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant={showRecentTab ? "default" : "outline"}
                onClick={async () => {
                  await loadData(); // Attendre le rafraîchissement avant d'afficher
                  setShowRecentTab(true);
                }}
                className="h-10 px-4"
              >
                📊 Pesées récentes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRecentTab(false);
                  handleCreateNewTab();
                }}
                className="h-10 px-4 border-white bg-green-600 hover:bg-green-700 text-white"
              >
                + Nouveau
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-20 bg-transparent"></div>

      <Tabs
        value={showRecentTab ? "recentes" : activeTabId}
        onValueChange={async (value) => {
          if (value === "recentes") {
            await loadData(); // Attendre le rafraîchissement avant d'afficher
            setShowRecentTab(true);
          } else {
            setShowRecentTab(false);
            setActiveTabId(value);
          }
        }}
      >
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <Card className="shadow-lg border-2">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-[50%_50%] items-stretch">
                  {/* Colonne gauche : Champs contextuels */}
                  <div className="space-y-3 lg:border-r lg:border-gray-200 lg:pr-4 flex flex-col h-full">
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
                      isAddPlaqueDialogOpen={isAddPlaqueDialogOpen}
                      setIsAddPlaqueDialogOpen={setIsAddPlaqueDialogOpen}
                      newPlaque={newPlaque}
                      setNewPlaque={setNewPlaque}
                      handleAddPlaque={handleAddPlaque}
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
                  </div>

                  {/* Colonne droite : Champs critiques + Actions */}
                  <div className="space-y-3 lg:pl-4 flex flex-col h-full">
                    <ProductWeightSection
                      currentData={tab.formData}
                      products={products}
                      updateCurrentTab={updateCurrentTabWithValidation}
                      validationErrors={validationErrors}
                    />

                    <div className="flex justify-center space-x-3 pt-3 mt-auto">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="recentes">
          <RecentPeseesTab
            key={
              pesees.length > 0
                ? `${pesees.length}-${pesees[0]?.id || Date.now()}`
                : Date.now()
            }
            pesees={pesees}
            products={products}
            transporteurs={transporteurs}
          />
        </TabsContent>
      </Tabs>

      <SaveConfirmDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onConfirm={handleSaveOnly}
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
