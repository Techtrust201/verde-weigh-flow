
const CACHE_NAME = 'barberis-v5';
const STATIC_CACHE = 'barberis-static-v5';
const API_CACHE = 'barberis-api-v5';

// TTL pour les différents types de ressources (en millisecondes)
const CACHE_TTL = {
  static: 24 * 60 * 60 * 1000, // 24h pour les assets statiques
  api: 5 * 60 * 1000, // 5min pour les données API
  images: 7 * 24 * 60 * 60 * 1000 // 7 jours pour les images
};

// Ressources critiques à mettre en cache immédiatement
const CRITICAL_RESOURCES = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/placeholder.svg'
];

// Ressources à pre-cacher lors de l'installation
const PRECACHE_RESOURCES = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/placeholder.svg'
];

// Installer le service worker avec pre-cache intelligent
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing v5 with intelligent caching');
  event.waitUntil(
    Promise.all([
      // Cache des ressources critiques
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Pre-caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      }),
      // Cache API pour les données fréquemment utilisées
      caches.open(API_CACHE).then((cache) => {
        console.log('Service Worker: Initializing API cache');
        return Promise.resolve();
      })
    ])
    .then(() => {
      console.log('Service Worker: All caches initialized');
      self.skipWaiting();
    })
    .catch((error) => {
      console.error('Service Worker: Installation failed', error);
    })
  );
});

// Activer le service worker avec nettoyage intelligent
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating v5');
  event.waitUntil(
    Promise.all([
      // Nettoyage des anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Nettoyer les entrées expirées
      cleanExpiredCache()
    ])
    .then(() => {
      console.log('Service Worker: Claiming clients');
      self.clients.claim();
    })
  );
});

// Fonction pour nettoyer les entrées expirées du cache
async function cleanExpiredCache() {
  const cacheNames = [CACHE_NAME, STATIC_CACHE, API_CACHE];
  
  for (const cacheName of cacheNames) {
    try {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const cachedTime = response.headers.get('sw-cached-time');
          if (cachedTime) {
            const age = Date.now() - parseInt(cachedTime);
            const ttl = getCacheTTL(request.url);
            
            if (age > ttl) {
              console.log('Service Worker: Removing expired cache entry', request.url);
              await cache.delete(request);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Service Worker: Error cleaning cache', cacheName, error);
    }
  }
}

// Déterminer le TTL selon le type de ressource
function getCacheTTL(url) {
  if (url.includes('/assets/') || url.includes('.css') || url.includes('.js')) {
    return CACHE_TTL.static;
  }
  if (url.includes('/api/') || url.includes('supabase')) {
    return CACHE_TTL.api;
  }
  if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) {
    return CACHE_TTL.images;
  }
  return CACHE_TTL.static;
}

// Ajouter timestamp au cache
async function addToCache(cacheName, request, response) {
  const cache = await caches.open(cacheName);
  const responseClone = response.clone();
  
  // Ajouter un timestamp pour le TTL
  const modifiedResponse = new Response(responseClone.body, {
    status: responseClone.status,
    statusText: responseClone.statusText,
    headers: {
      ...Object.fromEntries(responseClone.headers.entries()),
      'sw-cached-time': Date.now().toString()
    }
  });
  
  await cache.put(request, modifiedResponse);
}

// Intercepter les requêtes avec stratégies intelligentes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  
  // Stratégie Cache First pour les assets statiques (performance optimale)
  if (url.pathname.includes('/assets/') || 
      url.pathname.endsWith('.css') || 
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.svg')) {
    
    event.respondWith(
      caches.match(request)
        .then(async (cachedResponse) => {
          if (cachedResponse) {
            // Vérifier si le cache n'est pas expiré
            const cachedTime = cachedResponse.headers.get('sw-cached-time');
            if (cachedTime) {
              const age = Date.now() - parseInt(cachedTime);
              const ttl = getCacheTTL(request.url);
              
              if (age <= ttl) {
                return cachedResponse;
              }
            }
          }
          
          // Fetch et cache la nouvelle version
          try {
            const response = await fetch(request);
            if (response && response.status === 200) {
              await addToCache(STATIC_CACHE, request, response.clone());
            }
            return response;
          } catch (error) {
            // Retourner le cache même expiré en cas d'erreur réseau
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response('Resource not available offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          }
        })
    );
    return;
  }
  
  // Stratégie Stale While Revalidate pour l'API et les données
  if (url.pathname.includes('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(
      caches.match(request)
        .then(async (cachedResponse) => {
          // Fetch en arrière-plan pour mettre à jour le cache
          const fetchPromise = fetch(request)
            .then(async (response) => {
              if (response && response.status === 200) {
                await addToCache(API_CACHE, request, response.clone());
              }
              return response;
            })
            .catch(() => null);
          
          // Retourner le cache immédiatement s'il existe
          if (cachedResponse) {
            const cachedTime = cachedResponse.headers.get('sw-cached-time');
            if (cachedTime) {
              const age = Date.now() - parseInt(cachedTime);
              if (age <= CACHE_TTL.api) {
                return cachedResponse;
              }
            }
          }
          
          // Sinon attendre la réponse réseau
          return fetchPromise || cachedResponse;
        })
    );
    return;
  }
  
  // Stratégie Network First pour les pages (navigation)
  event.respondWith(
    fetch(request, { 
      // Timeout de 3 secondes pour les connexions lentes
      signal: AbortSignal.timeout(3000) 
    })
      .then(async (response) => {
        if (response && response.status === 200) {
          await addToCache(CACHE_NAME, request, response.clone());
        }
        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Pour les requêtes de navigation, retourner l'index
            if (request.mode === 'navigate') {
              return caches.match('/');
            }
            
            return new Response(`
              <html>
                <body style="font-family: system-ui; padding: 20px; text-align: center;">
                  <h2>Mode Hors Ligne</h2>
                  <p>Cette ressource n'est pas disponible hors ligne.</p>
                  <p>Vérifiez votre connexion internet.</p>
                  <button onclick="window.location.reload()">Réessayer</button>
                </body>
              </html>
            `, {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html' }
            });
          });
      })
  );
});

// Background Sync robuste pour les données en attente
self.addEventListener('sync', (event) => {
  console.log(`Service Worker: Background sync triggered for tag: ${event.tag}`);
  
  // Gérer tous les tags de sync (one-off et retry)
  if (event.tag.startsWith('pesees-sync-') || event.tag.includes('-retry-')) {
    event.waitUntil(handleBackgroundSync(event.tag, event.lastChance));
  }
});

// Periodic Background Sync (quotidien)
self.addEventListener('periodicsync', (event) => {
  console.log(`Service Worker: Periodic sync triggered for tag: ${event.tag}`);
  
  if (event.tag === 'daily-sync') {
    event.waitUntil(handlePeriodicSync());
  }
});

// Gestionnaire principal de Background Sync
async function handleBackgroundSync(tag, isLastChance = false) {
  const startTime = Date.now();
  
  try {
    console.log(`🔄 SW: Début sync ${tag}${isLastChance ? ' (dernière chance)' : ''}`);
    
    // Notifier le client de démarrer la sync
    const result = await notifyClientForSync(tag, isLastChance);
    
    if (!result.success) {
      console.error(`❌ SW: Échec sync ${tag}:`, result.error);
      throw new Error(result.error);
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ SW: Succès sync ${tag} en ${duration}ms`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ SW: Erreur sync ${tag} après ${duration}ms:`, error);
    
    // Si c'est la dernière chance, notifier le client pour gérer le ré-enregistrement
    if (isLastChance) {
      await notifyClientForReregister(tag, error.message);
    }
    
    throw error;
  }
}

// Gestionnaire de Periodic Sync quotidien
async function handlePeriodicSync() {
  const startTime = Date.now();
  
  try {
    console.log('📅 SW: Début periodic sync quotidien');
    
    const result = await notifyClientForSync('daily-sync', false);
    
    if (!result.success) {
      console.error('❌ SW: Échec periodic sync:', result.error);
      throw new Error(result.error);
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ SW: Succès periodic sync en ${duration}ms`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ SW: Erreur periodic sync après ${duration}ms:`, error);
    throw error;
  }
}

// Notifier le client pour exécuter la synchronisation
async function notifyClientForSync(tag, isLastChance) {
  const clients = await self.clients.matchAll();
  
  if (clients.length === 0) {
    return { success: false, error: 'Aucun client actif disponible' };
  }
  
  // Promesse pour attendre la réponse du client
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'Timeout de synchronisation (30s)' });
    }, 30000);
    
    // Handler pour la réponse
    const messageHandler = (event) => {
      if (event.data?.type === 'SYNC_RESPONSE' && event.data.tag === tag) {
        clearTimeout(timeout);
        self.removeEventListener('message', messageHandler);
        resolve(event.data.result);
      }
    };
    
    self.addEventListener('message', messageHandler);
    
    // Envoyer la demande à tous les clients
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_REQUEST',
        tag,
        isLastChance,
        timestamp: Date.now()
      });
    });
  });
}

// Notifier le client pour ré-enregistrer un sync abandonné
async function notifyClientForReregister(tag, error) {
  const clients = await self.clients.matchAll();
  
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_REREGISTER_REQUEST',
      originalTag: tag,
      error,
      timestamp: Date.now()
    });
  });
}

// Écouter les messages du client avec commandes étendues
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (!data) return;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_STATUS':
      // Retourner les stats du cache
      getCacheStats().then(stats => {
        event.ports[0]?.postMessage({
          type: 'CACHE_STATUS_RESPONSE',
          stats
        });
      });
      break;
      
    case 'CLEAR_CACHE':
      // Nettoyer le cache sur demande
      clearAllCaches().then(() => {
        event.ports[0]?.postMessage({
          type: 'CACHE_CLEARED'
        });
      });
      break;
      
    case 'FORCE_CACHE_UPDATE':
      // Forcer la mise à jour du cache
      updateCache().then(() => {
        event.ports[0]?.postMessage({
          type: 'CACHE_UPDATED'
        });
      });
      break;
  }
});

// Statistiques du cache
async function getCacheStats() {
  const stats = {
    caches: {},
    totalSize: 0,
    totalEntries: 0
  };
  
  const cacheNames = [CACHE_NAME, STATIC_CACHE, API_CACHE];
  
  for (const cacheName of cacheNames) {
    try {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      stats.caches[cacheName] = {
        entries: requests.length,
        urls: requests.map(req => req.url)
      };
      
      stats.totalEntries += requests.length;
    } catch (error) {
      console.warn('Error getting cache stats for', cacheName, error);
    }
  }
  
  return stats;
}

// Nettoyer tous les caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Mettre à jour le cache
async function updateCache() {
  await cleanExpiredCache();
  
  // Re-cache les ressources critiques
  const cache = await caches.open(STATIC_CACHE);
  await cache.addAll(CRITICAL_RESOURCES);
}
