/**
 * Service de synchronisation Track Déchet
 * Envoie directement les pesées dangereuses vers Track Déchet via le proxy Supabase
 * (Supabase utilisé uniquement comme proxy pour éviter les problèmes CORS)
 */

import { supabase } from "@/integrations/supabase/client";
import {
  Pesee,
  Client,
  Transporteur,
  Product,
  UserSettings,
} from "@/lib/database";
import { db } from "@/lib/database";
import { generateBSD } from "@/utils/trackdechetApi";

export class TrackDechetSyncService {
  private static instance: TrackDechetSyncService;

  public static getInstance(): TrackDechetSyncService {
    if (!TrackDechetSyncService.instance) {
      TrackDechetSyncService.instance = new TrackDechetSyncService();
    }
    return TrackDechetSyncService.instance;
  }

  /**
   * Envoie automatiquement une pesée avec produit dangereux vers Track Déchet
   * Utilise Supabase uniquement comme proxy pour éviter les problèmes CORS
   */
  async sendPeseeToTrackDechet(
    pesee: Pesee,
    client: Client,
    transporteur: Transporteur,
    product: Product,
    userSettings: UserSettings
  ): Promise<{ success: boolean; bsdId?: string; error?: string }> {
    if (!navigator.onLine) {
      console.log("📴 Mode hors ligne: envoi Track Déchet reporté");
      return { success: false, error: "Mode hors ligne" };
    }

    try {
      console.log(`🚛 Envoi pesée ${pesee.numeroBon} vers Track Déchet...`);

      // Vérifier que le produit a un code déchet
      if (!product.codeDechets) {
        return {
          success: false,
          error: "Code déchet manquant pour ce produit",
        };
      }

      // Vérifier que le token Track Déchet est configuré
      if (!userSettings.trackDechetToken) {
        return { success: false, error: "Token Track Déchet non configuré" };
      }

      // Utiliser la fonction existante pour générer le BSD
      const result = await generateBSD(
        pesee,
        client,
        transporteur,
        product,
        product.codeDechets,
        userSettings.trackDechetToken
      );

      if (result.success) {
        console.log(
          "✅ BSD envoyé avec succès vers Track Déchet:",
          result.bsdId
        );

        // Mettre à jour la pesée localement avec l'ID du BSD
        await db.pesees.update(pesee.id!, {
          bsdId: result.bsdId,
          trackDechetSynced: true,
          trackDechetSyncDate: new Date(),
        });

        return { success: true, bsdId: result.bsdId };
      } else {
        console.error("❌ Erreur envoi vers Track Déchet:", result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi vers Track Déchet:", error);
      return {
        success: false,
        error: "Erreur lors de l'envoi vers Track Déchet",
      };
    }
  }

  /**
   * Synchronise les paramètres Track Déchet vers Supabase (token uniquement)
   */
  async syncTrackDechetSettings(userSettings: UserSettings): Promise<void> {
    if (!navigator.onLine) {
      console.log(
        "📴 Mode hors ligne: synchronisation paramètres Track Déchet reportée"
      );
      return;
    }

    try {
      console.log("🚛 Synchronisation des paramètres Track Déchet...");

      const trackDechetSettings = {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        // Paramètres Track Déchet uniquement
        track_dechet_token: userSettings.trackDechetToken,
        track_dechet_enabled: userSettings.trackDechetEnabled,
        track_dechet_validated: userSettings.trackDechetValidated,
        track_dechet_validated_at:
          userSettings.trackDechetValidatedAt?.toISOString(),
        track_dechet_sandbox_mode: userSettings.trackDechetSandboxMode,
        numero_recepisse: userSettings.numeroRecepisse,
        date_validite_recepisse: userSettings.dateValiditeRecepisse,
        numero_autorisation: userSettings.numeroAutorisation,
        // Informations entreprise nécessaires pour Track Déchet
        nom_entreprise: userSettings.nomEntreprise,
        adresse: userSettings.adresse,
        code_postal: userSettings.codePostal,
        ville: userSettings.ville,
        email: userSettings.email,
        telephone: userSettings.telephone,
        siret: userSettings.siret,
        code_ape: userSettings.codeAPE,
        representant_legal: userSettings.representantLegal,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("user_settings")
        .upsert(trackDechetSettings, {
          onConflict: "user_id",
        });

      if (error) {
        console.warn(
          "⚠️ Erreur synchronisation paramètres Track Déchet:",
          error
        );
        return;
      }

      console.log("✅ Paramètres Track Déchet synchronisés");
    } catch (error) {
      console.error(
        "❌ Erreur lors de la synchronisation paramètres Track Déchet:",
        error
      );
    }
  }
}

// Instance globale
export const trackDechetSync = TrackDechetSyncService.getInstance();
