import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Client, Transporteur } from "@/lib/database";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PeseeFormSectionProps {
  currentData: any;
  clients: Client[];
  transporteurs: Transporteur[];
  updateCurrentTab: (data: Partial<any>) => void;
  onAddClient: () => void;
  isAddClientDialogOpen: boolean;
  setIsAddClientDialogOpen: (open: boolean) => void;
  newClientForm: Partial<Client>;
  setNewClientForm: (form: Partial<Client>) => void;
  handleAddNewClient: () => Promise<void>;
  validateNewClient: () => boolean;
  isAddChantierDialogOpen: boolean;
  setIsAddChantierDialogOpen: (open: boolean) => void;
  newChantier: string;
  setNewChantier: (chantier: string) => void;
  handleAddChantier: () => Promise<void>;
  isAddTransporteurDialogOpen: boolean;
  setIsAddTransporteurDialogOpen: (open: boolean) => void;
  newTransporteurForm: Partial<Transporteur>;
  setNewTransporteurForm: (form: Partial<Transporteur>) => void;
  handleAddNewTransporteur: () => Promise<void>;
  validateNewTransporteur: () => boolean;
}

export function PeseeFormSection({
  currentData,
  clients,
  transporteurs,
  updateCurrentTab,
  onAddClient,
  isAddClientDialogOpen,
  setIsAddClientDialogOpen,
  newClientForm,
  setNewClientForm,
  handleAddNewClient,
  validateNewClient,
  isAddChantierDialogOpen,
  setIsAddChantierDialogOpen,
  newChantier,
  setNewChantier,
  handleAddChantier,
  isAddTransporteurDialogOpen,
  setIsAddTransporteurDialogOpen,
  newTransporteurForm,
  setNewTransporteurForm,
  handleAddNewTransporteur,
  validateNewTransporteur,
}: PeseeFormSectionProps) {
  const [clientNomEntreprise, setClientNomEntreprise] = useState("");

  // Fonction pour obtenir le nom de transporteur auto-généré
  const getAutoTransporteurName = (): string => {
    // Si un client est sélectionné, utiliser sa raison sociale
    if (currentData.clientId) {
      const selectedClient = clients.find(c => c.id === currentData.clientId);
      if (selectedClient) {
        return selectedClient.raisonSociale;
      }
    }
    
    // Sinon utiliser le nom saisi manuellement
    return currentData.nomEntreprise || "";
  };

  const handleClientSelect = (clientId: string) => {
    if (clientId === "new") {
      onAddClient();
      return;
    }

    const selectedClient = clients.find((c) => c.id === parseInt(clientId));
    if (selectedClient) {
      updateCurrentTab({
        nomEntreprise: selectedClient.raisonSociale,
        clientId: selectedClient.id,
        typeClient: selectedClient.typeClient,
        // Prioriser le transporteur existant du client, sinon laisser à 0 pour l'auto-remplissage
        transporteurId: selectedClient.transporteurId || 0,
        plaque: "",
        chantier: "",
      });
      setClientNomEntreprise("");
    }
  };

  const handleNomEntrepriseChange = (value: string) => {
    updateCurrentTab({
      nomEntreprise: value,
      clientId: 0,
      // Garder le transporteur actuel si déjà sélectionné, sinon laisser à 0 pour l'auto-remplissage
      transporteurId: currentData.transporteurId || 0,
    });
  };

  const filteredClients = clients.filter((client) =>
    client.raisonSociale.toLowerCase().includes(clientNomEntreprise.toLowerCase())
  );

  const selectedClient = currentData.clientId
    ? clients.find((c) => c.id === currentData.clientId)
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Bon number Section */}
      <div>
        <Label htmlFor="bonNumber" className="text-sm font-medium mb-2 block">
          Numéro de Bon <span className="text-red-500 ml-1">*</span>
        </Label>
        <Input
          id="bonNumber"
          type="text"
          value={currentData.numeroBon}
          onChange={(e) =>
            updateCurrentTab({ numeroBon: e.target.value })
          }
          placeholder="Entrez le numéro de bon"
          required
          className="w-full"
        />
      </div>

      {/* Client/Entreprise Section */}
      <div className="space-y-4">
        {/* Type client radio group */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Type de Client <span className="text-red-500 ml-1">*</span>
          </Label>
          <RadioGroup
            defaultValue={currentData.typeClient || "particulier"}
            onValueChange={(value) => updateCurrentTab({ typeClient: value })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="particulier" id="r1" />
              <Label htmlFor="r1">Particulier</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="professionnel" id="r2" />
              <Label htmlFor="r2">Professionnel</Label>
            </div>
          </RadioGroup>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            {currentData.typeClient === "particulier" ? "Client" : "Entreprise"}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="flex gap-2">
            <Select
              value={currentData.clientId?.toString() || ""}
              onValueChange={handleClientSelect}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Sélectionner un client existant" />
              </SelectTrigger>
              <SelectContent>
                {filteredClients.map((client) => (
                  <SelectItem key={client.id} value={client.id!.toString()}>
                    {client.raisonSociale}
                  </SelectItem>
                ))}
                <SelectItem value="new">+ Nouveau client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Input pour nom entreprise si pas de client sélectionné */}
          {!currentData.clientId && (
            <div className="mt-2">
              <Input
                value={currentData.nomEntreprise}
                onChange={(e) => handleNomEntrepriseChange(e.target.value)}
                placeholder={
                  currentData.typeClient === "particulier"
                    ? "Nom du particulier"
                    : "Nom de l'entreprise"
                }
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Plaque input section */}
        <div>
          <Label htmlFor="plaque" className="text-sm font-medium mb-2 block">
            Plaque <span className="text-red-500 ml-1">*</span>
          </Label>
          <Input
            id="plaque"
            type="text"
            value={currentData.plaque}
            onChange={(e) => updateCurrentTab({ plaque: e.target.value })}
            placeholder="Entrez la plaque d'immatriculation"
            required
            className="w-full"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Transporteur</label>
          <div className="flex gap-2">
            <Select
              value={currentData.transporteurId?.toString() || "0"}
              onValueChange={(value) => {
                updateCurrentTab({
                  transporteurId: value === "new" ? 0 : parseInt(value),
                });
                if (value === "new") {
                  setIsAddTransporteurDialogOpen(true);
                }
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue>
                  {currentData.transporteurId && currentData.transporteurId > 0 ? (
                    // Transporteur sélectionné normalement
                    transporteurs.find(t => t.id === currentData.transporteurId)?.prenom + " " +
                    transporteurs.find(t => t.id === currentData.transporteurId)?.nom
                  ) : (
                    // Auto-remplissage
                    getAutoTransporteurName() ? (
                      <span className="italic text-gray-600">
                        {getAutoTransporteurName()}
                      </span>
                    ) : (
                      "Sélectionner un transporteur"
                    )
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {transporteurs.map((transporteur) => (
                  <SelectItem key={transporteur.id} value={transporteur.id!.toString()}>
                    {transporteur.prenom} {transporteur.nom}
                  </SelectItem>
                ))}
                <SelectItem value="new">+ Nouveau transporteur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chantier section */}
        <div>
          <Label htmlFor="chantier" className="text-sm font-medium mb-2 block">
            Chantier
          </Label>
          <div className="flex gap-2">
            <Input
              id="chantier"
              type="text"
              value={currentData.chantier}
              onChange={(e) =>
                updateCurrentTab({ chantier: e.target.value })
              }
              placeholder="Entrez le nom du chantier"
              className="flex-grow"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddChantierDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau
            </Button>
          </div>
        </div>
      </div>

      {/* Add Client Dialog */}
      <Dialog open={isAddClientDialogOpen} onOpenChange={setIsAddClientDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau client</DialogTitle>
            <DialogDescription>
              Créez un nouveau client pour l'ajouter à la liste.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type de Client
              </Label>
              <RadioGroup
                defaultValue={newClientForm.typeClient || "particulier"}
                onValueChange={(value) =>
                  setNewClientForm({ ...newClientForm, typeClient: value })
                }
                className="col-span-3 flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="particulier" id="client-type-r1" />
                  <Label htmlFor="client-type-r1">Particulier</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="professionnel" id="client-type-r2" />
                  <Label htmlFor="client-type-r2">Professionnel</Label>
                </div>
              </RadioGroup>
            </div>

            {newClientForm.typeClient === "particulier" ? (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="prenom" className="text-right">
                    Prénom
                  </Label>
                  <Input
                    type="text"
                    id="prenom"
                    value={newClientForm.prenom || ""}
                    onChange={(e) =>
                      setNewClientForm({
                        ...newClientForm,
                        prenom: e.target.value,
                      })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nom" className="text-right">
                    Nom
                  </Label>
                  <Input
                    type="text"
                    id="nom"
                    value={newClientForm.nom || ""}
                    onChange={(e) =>
                      setNewClientForm({ ...newClientForm, nom: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="raisonSociale" className="text-right">
                  Raison Sociale
                </Label>
                <Input
                  type="text"
                  id="raisonSociale"
                  value={newClientForm.raisonSociale || ""}
                  onChange={(e) =>
                    setNewClientForm({
                      ...newClientForm,
                      raisonSociale: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
            )}

            {newClientForm.typeClient === "professionnel" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="siret" className="text-right">
                  SIRET
                </Label>
                <Input
                  type="text"
                  id="siret"
                  value={newClientForm.siret || ""}
                  onChange={(e) =>
                    setNewClientForm({ ...newClientForm, siret: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="telephone" className="text-right">
                Téléphone
              </Label>
              <Input
                type="tel"
                id="telephone"
                value={newClientForm.telephone || ""}
                onChange={(e) =>
                  setNewClientForm({
                    ...newClientForm,
                    telephone: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsAddClientDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              onClick={handleAddNewClient}
              disabled={!validateNewClient()}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Chantier Dialog */}
      <Dialog open={isAddChantierDialogOpen} onOpenChange={setIsAddChantierDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau chantier</DialogTitle>
            <DialogDescription>
              Ajouter un nouveau chantier pour le client sélectionné.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="chantierName" className="text-right">
                Nom du Chantier
              </Label>
              <Input
                type="text"
                id="chantierName"
                value={newChantier}
                onChange={(e) => setNewChantier(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsAddChantierDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" onClick={handleAddChantier}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transporteur Dialog */}
      <Dialog open={isAddTransporteurDialogOpen} onOpenChange={setIsAddTransporteurDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau transporteur</DialogTitle>
            <DialogDescription>
              Créez un nouveau transporteur pour l'ajouter à la liste.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="prenomTransporteur" className="text-right">
                Prénom
              </Label>
              <Input
                type="text"
                id="prenomTransporteur"
                value={newTransporteurForm.prenom || ""}
                onChange={(e) =>
                  setNewTransporteurForm({
                    ...newTransporteurForm,
                    prenom: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nomTransporteur" className="text-right">
                Nom
              </Label>
              <Input
                type="text"
                id="nomTransporteur"
                value={newTransporteurForm.nom || ""}
                onChange={(e) =>
                  setNewTransporteurForm({
                    ...newTransporteurForm,
                    nom: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="siretTransporteur" className="text-right">
                SIRET
              </Label>
              <Input
                type="text"
                id="siretTransporteur"
                value={newTransporteurForm.siret || ""}
                onChange={(e) =>
                  setNewTransporteurForm({
                    ...newTransporteurForm,
                    siret: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adresseTransporteur" className="text-right">
                Adresse
              </Label>
              <Input
                type="text"
                id="adresseTransporteur"
                value={newTransporteurForm.adresse || ""}
                onChange={(e) =>
                  setNewTransporteurForm({
                    ...newTransporteurForm,
                    adresse: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="codePostalTransporteur" className="text-right">
                Code Postal
              </Label>
              <Input
                type="text"
                id="codePostalTransporteur"
                value={newTransporteurForm.codePostal || ""}
                onChange={(e) =>
                  setNewTransporteurForm({
                    ...newTransporteurForm,
                    codePostal: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="villeTransporteur" className="text-right">
                Ville
              </Label>
              <Input
                type="text"
                id="villeTransporteur"
                value={newTransporteurForm.ville || ""}
                onChange={(e) =>
                  setNewTransporteurForm({
                    ...newTransporteurForm,
                    ville: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emailTransporteur" className="text-right">
                Email
              </Label>
              <Input
                type="email"
                id="emailTransporteur"
                value={newTransporteurForm.email || ""}
                onChange={(e) =>
                  setNewTransporteurForm({
                    ...newTransporteurForm,
                    email: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="telephoneTransporteur" className="text-right">
                Téléphone
              </Label>
              <Input
                type="tel"
                id="telephoneTransporteur"
                value={newTransporteurForm.telephone || ""}
                onChange={(e) =>
                  setNewTransporteurForm({
                    ...newTransporteurForm,
                    telephone: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plaqueTransporteur" className="text-right">
                Plaque
              </Label>
              <Input
                type="text"
                id="plaqueTransporteur"
                value={newTransporteurForm.plaque || ""}
                onChange={(e) =>
                  setNewTransporteurForm({
                    ...newTransporteurForm,
                    plaque: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsAddTransporteurDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              onClick={handleAddNewTransporteur}
              disabled={!validateNewTransporteur()}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react";
