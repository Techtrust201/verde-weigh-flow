"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MissingFieldsResult,
  MissingFieldsClient,
  MissingFieldsProduct,
} from "@/utils/validateMissingFields";
import { db, Client, Product } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface MissingFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingFields: MissingFieldsResult;
  onFixed: () => void;
}

export function MissingFieldsDialog({
  open,
  onOpenChange,
  missingFields,
  onFixed,
}: MissingFieldsDialogProps) {
  const { toast } = useToast();
  const [clients, setClients] = useState<MissingFieldsClient[]>(
    missingFields.clients
  );
  const [products, setProducts] = useState<MissingFieldsProduct[]>(
    missingFields.products
  );
  const [isFixing, setIsFixing] = useState(false);

  const handleClientRaisonSocialeChange = (index: number, value: string) => {
    const updated = [...clients];
    updated[index] = { ...updated[index], suggestedRaisonSociale: value };
    setClients(updated);
  };

  const handleProductCodeChange = (index: number, value: string) => {
    const updated = [...products];
    updated[index] = { ...updated[index], suggestedCodeProduct: value };
    setProducts(updated);
  };

  const handleFixAll = async () => {
    setIsFixing(true);
    try {
      // Corriger tous les clients
      for (const item of clients) {
        if (item.suggestedRaisonSociale.trim()) {
          const fullClient = await db.clients.get(item.client.id!);
          if (fullClient) {
            await db.clients.put({
              ...fullClient,
              raisonSociale: item.suggestedRaisonSociale.trim(),
              updatedAt: new Date(),
            } as Client);
          }
        }
      }

      // Corriger tous les produits
      for (const item of products) {
        if (item.suggestedCodeProduct.trim()) {
          const fullProduct = await db.products.get(item.product.id!);
          if (fullProduct) {
            await db.products.put({
              ...fullProduct,
              codeProduct: item.suggestedCodeProduct.trim(),
              updatedAt: new Date(),
            } as Product);
          }
        }
      }

      toast({
        title: "Correction réussie",
        description: `${clients.length} client(s) et ${products.length} produit(s) corrigé(s).`,
      });

      onFixed();
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de la correction:", error);
      toast({
        title: "Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Impossible de corriger les entités",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  const totalIssues = clients.length + products.length;

  if (totalIssues === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-warning/20 text-warning flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Champs obligatoires manquants</DialogTitle>
              <DialogDescription className="mt-2">
                {totalIssues} entité(s) nécessitent une correction avant de
                pouvoir continuer.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Clients sans raisonSociale */}
          {clients.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">
                Clients sans raison sociale ({clients.length})
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {clients.map((item, index) => (
                  <div
                    key={item.client.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <Label htmlFor={`client-${index}`} className="text-xs">
                        Client ID: {item.client.id}
                        {item.client.codeClient &&
                          ` (Code: ${item.client.codeClient})`}
                      </Label>
                      <Input
                        id={`client-${index}`}
                        value={item.suggestedRaisonSociale}
                        onChange={(e) =>
                          handleClientRaisonSocialeChange(index, e.target.value)
                        }
                        placeholder="Raison sociale"
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Produits sans codeProduct */}
          {products.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">
                Produits sans code produit ({products.length})
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {products.map((item, index) => (
                  <div
                    key={item.product.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <Label htmlFor={`product-${index}`} className="text-xs">
                        {item.product.nom || `Produit ID: ${item.product.id}`}
                      </Label>
                      <Input
                        id={`product-${index}`}
                        value={item.suggestedCodeProduct}
                        onChange={(e) =>
                          handleProductCodeChange(index, e.target.value)
                        }
                        placeholder="Code produit"
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isFixing}
          >
            Annuler
          </Button>
          <Button onClick={handleFixAll} disabled={isFixing}>
            {isFixing ? "Correction en cours..." : "Corriger tout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}










