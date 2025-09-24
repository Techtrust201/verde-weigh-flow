/**
 * Module d'intégration avec l'API Track Déchet
 * API GraphQL officielle : https://api.trackdechets.beta.gouv.fr/graphql
 */

import { formatPeseeForTrackDechet } from './trackdechetValidation';
import { Pesee, Product, Client, Transporteur, BSD, db } from '@/lib/database';

// Configuration API Track Déchet
const TRACKDECHET_API_URL = 'https://api.trackdechets.beta.gouv.fr/graphql';
const TRACKDECHET_SANDBOX_URL = 'https://sandbox.trackdechets.beta.gouv.fr/graphql';

// Utiliser sandbox en développement
const API_URL = process.env.NODE_ENV === 'production' ? TRACKDECHET_API_URL : TRACKDECHET_SANDBOX_URL;

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
    // Formater les données pour Track Déchet
    const bsdData = formatPeseeForTrackDechet(pesee, client, transporteur, product, codeDechet);
    
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

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          createFormInput: bsdData
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: TrackDechetResponse = await response.json();

    if (result.errors) {
      console.error('Track Déchet API errors:', result.errors);
      return {
        success: false,
        error: result.errors[0]?.message || 'Erreur inconnue de l\'API Track Déchet'
      };
    }

    const bsdId = result.data?.createForm?.id;
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
    status,
    generatedAt: now,
    createdAt: now,
    updatedAt: now
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

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        query,
        variables: { id: bsdId }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: TrackDechetResponse = await response.json();

    if (result.errors) {
      return {
        success: false,
        error: result.errors[0]?.message || 'Erreur lors de la récupération du statut'
      };
    }

    return {
      success: true,
      status: result.data?.form?.status
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
          updatedAt: new Date()
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

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query })
    });

    const result: TrackDechetResponse = await response.json();
    
    // Gestion des erreurs HTTP
    if (!response.ok) {
      if (response.status === 401) {
        return {
          isValid: false,
          errorType: 'invalid_token',
          errorMessage: 'Token invalide ou expiré'
        };
      }
      if (response.status === 403) {
        return {
          isValid: false,
          errorType: 'permissions',
          errorMessage: 'Permissions insuffisantes pour ce token'
        };
      }
      return {
        isValid: false,
        errorType: 'network',
        errorMessage: `Erreur serveur (${response.status})`
      };
    }

    // Gestion des erreurs GraphQL
    if (result.errors && result.errors.length > 0) {
      const error = result.errors[0];
      
      if (error.message.includes('UNAUTHENTICATED') || error.message.includes('Invalid token')) {
        return {
          isValid: false,
          errorType: 'invalid_token',
          errorMessage: 'Token invalide ou expiré'
        };
      }
      
      if (error.message.includes('FORBIDDEN')) {
        return {
          isValid: false,
          errorType: 'permissions',
          errorMessage: 'Permissions insuffisantes'
        };
      }

      return {
        isValid: false,
        errorType: 'invalid_token',
        errorMessage: error.message
      };
    }

    // Vérification de la présence des données utilisateur
    if (!result.data?.me) {
      return {
        isValid: false,
        errorType: 'invalid_token',
        errorMessage: 'Impossible de récupérer les informations utilisateur'
      };
    }

    return {
      isValid: true,
      userInfo: {
        id: result.data.me.id,
        email: result.data.me.email,
        name: result.data.me.name
      }
    };

  } catch (error) {
    console.error('Erreur validation token:', error);
    return {
      isValid: false,
      errorType: 'network',
      errorMessage: 'Erreur de connexion au service Track Déchet'
    };
  }
};