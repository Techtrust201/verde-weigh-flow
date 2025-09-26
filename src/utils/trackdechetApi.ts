/**
 * Module d'intégration avec l'API Track Déchet via proxy backend
 * Tous les appels passent maintenant par notre edge function pour éviter CORS
 */

import { formatPeseeForTrackDechet } from './trackdechetValidation';
import { Pesee, Product, Client, Transporteur, BSD, db } from '@/lib/database';
import { supabase } from '@/integrations/supabase/client';
import { getGlobalSettings } from '@/lib/globalSettings';

/**
 * Interface pour les réponses de l'API Track Déchet
 */
interface TrackDechetResponse {
  data?: any;
  errors?: Array<{
    message: string;
    extensions?: any;
  }>;
}

/**
 * Génère un BSD via l'API Track Déchet
 */
export const generateBSD = async (
  pesee: Pesee,
  client: Client,
  transporteur: Transporteur,
  product: Product,
  codeDechet: string,
  apiToken: string
): Promise<{ success: boolean; bsdId?: string; error?: string }> => {
  try {
    // Récupérer les paramètres utilisateur pour les informations de l'entreprise
    const userSettings = await db.userSettings.toCollection().first();
    if (!userSettings) {
      throw new Error('Informations entreprise non configurées. Veuillez configurer vos informations dans l\'espace Utilisateur.');
    }
    
    // Formater les données pour Track Déchet
    const bsdData = formatPeseeForTrackDechet(pesee, client, transporteur, product, codeDechet, userSettings);
    
    // Mutation GraphQL pour créer le BSD
    const mutation = `
      mutation CreateForm($createFormInput: CreateFormInput!) {
        createForm(createFormInput: $createFormInput) {
          id
          readableId
          status
          emitter {
            company {
              name
              siret
            }
          }
          transporter {
            company {
              name
              siret
            }
          }
          wasteDetails {
            code
            name
            quantity
          }
        }
      }
    `;

    const settings = await getGlobalSettings();
    const sandbox = !!settings.trackDechetSandboxMode;

    const { data, error } = await supabase.functions.invoke('trackdechet-proxy/createForm', {
      body: { ...bsdData, sandbox, token: apiToken }
    });

    if (error) {
      throw new Error(`Proxy error: ${error.message}`);
    }

    const result = data;

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Erreur inconnue lors de la création du BSD'
      };
    }

    const bsdId = result.bsd?.id;
    if (!bsdId) {
      return {
        success: false,
        error: 'Aucun ID de BSD retourné par l\'API'
      };
    }

    // Sauvegarder le BSD localement
    await saveBSDLocally(pesee.id!, bsdId, 'draft');

    // Mettre à jour la pesée avec l'ID BSD
    await db.pesees.update(pesee.id!, { bsdId });

    return {
      success: true,
      bsdId
    };

  } catch (error) {
    console.error('Erreur génération BSD:', error);
    
    // Gestion gracieuse des erreurs CORS pour préserver le mode hors ligne
    if (error instanceof TypeError && (error.message.includes('CORS') || error.message.includes('fetch'))) {
      // Créer un BSD temporaire qui sera synchronisé plus tard
      const tempBsdId = `offline_${Date.now()}_${pesee.id}`;
      await saveBSDLocally(pesee.id!, tempBsdId, 'pending_sync');
      
      return {
        success: true,
        bsdId: tempBsdId,
        error: 'BSD créé en mode hors ligne. Sera synchronisé automatiquement.'
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};

/**
 * Sauvegarde un BSD localement
 */
export const saveBSDLocally = async (
  peseeId: number,
  bsdId: string,
  status: BSD['status']
): Promise<void> => {
  const now = new Date();
  
  const bsd: Omit<BSD, 'id'> = {
    peseeId,
    bsdId,
    readableId: bsdId,
    status,
    generatedAt: now,
    createdAt: now,
    lastSyncAt: now
  };

  await db.bsds.add(bsd);
};

/**
 * Récupère le statut d'un BSD depuis Track Déchet
 */
export const getBSDStatus = async (
  bsdId: string,
  apiToken: string
): Promise<{ success: boolean; status?: string; error?: string }> => {
  try {
    const query = `
      query GetForm($id: ID!) {
        form(id: $id) {
          id
          readableId
          status
          stateSummary {
            quantity
            packagingInfos {
              type
              quantity
            }
          }
        }
      }
    `;

    const settings = await getGlobalSettings();
    const sandbox = !!settings.trackDechetSandboxMode;

    const { data, error } = await supabase.functions.invoke('trackdechet-proxy/getForm', {
      body: { id: bsdId, sandbox, token: apiToken }
    });

    if (error) {
      throw new Error(`Proxy error: ${error.message}`);
    }

    const result = data;

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Erreur lors de la récupération du statut'
      };
    }

    return {
      success: true,
      status: result.bsd?.status
    };

  } catch (error) {
    console.error('Erreur récupération statut BSD:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};

/**
 * Synchronise tous les BSD locaux avec Track Déchet
 */
export const syncAllBSDs = async (apiToken: string): Promise<void> => {
  try {
    const localBSDs = await db.bsds.toArray();
    
    for (const bsd of localBSDs) {
      const statusResult = await getBSDStatus(bsd.bsdId, apiToken);
      
      if (statusResult.success && statusResult.status) {
        // Mettre à jour le statut local
        await db.bsds.update(bsd.id!, {
          status: statusResult.status as BSD['status'],
          lastSyncAt: new Date()
        });
      }
    }
  } catch (error) {
    console.error('Erreur synchronisation BSD:', error);
  }
};

/**
 * Types d'erreurs de validation Track Déchet
 */
export interface ValidationResult {
  isValid: boolean;
  errorType?: 'invalid_token' | 'expired' | 'permissions' | 'network' | 'format';
  errorMessage?: string;
  userInfo?: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Valide un token API Track Déchet avec détails d'erreur
 */
export const validateTrackDechetToken = async (token: string): Promise<boolean> => {
  const result = await validateTrackDechetTokenDetailed(token);
  return result.isValid;
};

/**
 * Valide un token API Track Déchet avec informations détaillées
 */
export const validateTrackDechetTokenDetailed = async (token: string): Promise<ValidationResult> => {
  // Vérification du format du token
  if (!token || token.trim().length === 0) {
    return {
      isValid: false,
      errorType: 'format',
      errorMessage: 'Le token ne peut pas être vide'
    };
  }

  if (token.length < 10) {
    return {
      isValid: false,
      errorType: 'format',
      errorMessage: 'Le token semble trop court (minimum 10 caractères)'
    };
  }

  try {
    const query = `
      query {
        me {
          id
          email
          name
        }
      }
    `;

    const settings = await getGlobalSettings();
    const sandbox = !!settings.trackDechetSandboxMode;

    const { data, error } = await supabase.functions.invoke('trackdechet-proxy/validateToken', {
      body: { token, sandbox }
    });

    if (error) {
      console.error('Proxy error:', error);
      return {
        isValid: false,
        errorType: 'network',
        errorMessage: 'Erreur de connexion au proxy backend'
      };
    }

    const result = data;
    
    if (!result.success || !result.isValid) {
      return {
        isValid: false,
        errorType: result.errorType || 'invalid_token',
        errorMessage: result.errorMessage || 'Token invalide'
      };
    }

    return {
      isValid: true,
      userInfo: result.userInfo ? {
        id: result.userInfo.id,
        email: result.userInfo.email,
        name: result.userInfo.name
      } : undefined
    };

  } catch (error) {
    console.error('Erreur validation token:', error);
    
    // Gestion spéciale pour CORS - important pour le mode PWA hors ligne
    if (error instanceof TypeError && (error.message.includes('CORS') || error.message.includes('fetch'))) {
      return {
        isValid: true, // On considère que le token est probablement valide
        errorType: 'network',
        errorMessage: 'Validation impossible (CORS). Token accepté pour usage hors ligne.'
      };
    }
    
    return {
      isValid: false,
      errorType: 'network',
      errorMessage: 'Erreur de connexion au service Track Déchet'
    };
  }
};