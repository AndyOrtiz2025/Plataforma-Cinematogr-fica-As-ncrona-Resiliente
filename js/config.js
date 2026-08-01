/* =====================================================================
   config.js
   Configuración global, catálogo de géneros y diccionario de idiomas.
   No depende de ningún otro módulo (es la base de la arquitectura).
   ===================================================================== */

export const CONFIG = {
  API_KEY: 'a31a6665b091c8dfe625ee8550f8c116',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMG_BASE: 'https://image.tmdb.org/t/p/w342',
  SIMULATED_LATENCY_MS: 900,
  // Probabilidad de que los servicios NO críticos (Reseñas / Anuncios)
  // fallen de forma simulada — usada por Promise.allSettled en services.js
  SERVICE_FAILURE_RATE: 0.35
};

export function isApiConfigured() {
  return CONFIG.API_KEY && CONFIG.API_KEY !== 'PON_AQUI_TU_API_KEY_DE_TMDB';
}

export const GENRES = [
  { id: 28, es: 'Acción', en: 'Action' }, { id: 12, es: 'Aventura', en: 'Adventure' }, { id: 16, es: 'Animación', en: 'Animation' },
  { id: 35, es: 'Comedia', en: 'Comedy' }, { id: 80, es: 'Crimen', en: 'Crime' }, { id: 18, es: 'Drama', en: 'Drama' },
  { id: 14, es: 'Fantasía', en: 'Fantasy' }, { id: 27, es: 'Terror', en: 'Horror' }, { id: 9648, es: 'Misterio', en: 'Mystery' },
  { id: 10749, es: 'Romance', en: 'Romance' }, { id: 878, es: 'Ciencia ficción', en: 'Science Fiction' }, { id: 53, es: 'Suspenso', en: 'Thriller' }
];

export function genreMapForLang(lang) {
  return new Map(GENRES.map(g => [g.id, g[lang]]));
}

/* ---------------------------------------------------------------------
   Idioma actual — variable privada del módulo. Se expone solo a través
   de getLang()/setLang() para que ningún otro módulo la mute directo.
   --------------------------------------------------------------------- */
let currentLang = 'es';

export function getLang() { return currentLang; }
export function setLang(lang) { currentLang = lang; }

export const UI_TEXT = {
  es: {
    eyebrow: 'Función continua · Sesión en vivo',
    subtitle: 'Galería dinámica de películas — módulos ESM, closures y resiliencia async',
    labelSearch: 'Buscar título', labelGenre: 'Género', labelYear: 'Año', optAll: 'Todos',
    btnSearch: 'Buscar', btnFavOnly: 'Solo favoritos',
    leaderLabel: 'Cargando rollo de datos…',
    emptyState: 'No hay tomas que coincidan con este encuadre. Ajusta tus filtros.',
    favPanelTitle: 'VIP · Favoritos',
    favPanelEmpty: 'Aún no marcas favoritos. Toca la ★ en un póster.',
    statusLoading: 'Consultando 3 servicios en paralelo…',
    statusDemo: 'Modo demo: usando datos simulados (agrega tu API Key para datos reales).',
    statusResults: n => `${n} resultado(s) encontrados.`,
    statusError: 'No se pudo cargar el catálogo principal. Revisa tu conexión o API Key.',
    statusCacheHit: 'Resultado servido desde caché (sin red) ⚡',
    modalRating: 'Calificación', unclassified: 'Sin clasificar',
    reviewsLabel: 'Reseñas de la comunidad',
    reviewsUnavailable: '⚠️ Servicio de Reseñas no disponible en este momento.',
    adsUnavailable: '⚠️ Servicio de Anuncios no disponible en este momento.',
    langToggle: '🌐 EN'
  },
  en: {
    eyebrow: 'Continuous showing · Live session',
    subtitle: 'Dynamic movie gallery — ESM modules, closures and async resilience',
    labelSearch: 'Search title', labelGenre: 'Genre', labelYear: 'Year', optAll: 'All',
    btnSearch: 'Search', btnFavOnly: 'Favorites only',
    leaderLabel: 'Loading data reel…',
    emptyState: 'No shots match this frame. Adjust your filters.',
    favPanelTitle: 'VIP · Favorites',
    favPanelEmpty: 'No favorites yet. Tap the ★ on a poster.',
    statusLoading: 'Querying 3 services in parallel…',
    statusDemo: 'Demo mode: using mock data (add your API Key for real data).',
    statusResults: n => `${n} result(s) found.`,
    statusError: 'Could not load the main catalog. Check your connection or API Key.',
    statusCacheHit: 'Result served from cache (no network) ⚡',
    modalRating: 'Rating', unclassified: 'Unclassified',
    reviewsLabel: 'Community reviews',
    reviewsUnavailable: '⚠️ Reviews service is currently unavailable.',
    adsUnavailable: '⚠️ Ads service is currently unavailable.',
    langToggle: '🌐 ES'
  }
};

export function t(key) {
  return UI_TEXT[currentLang][key];
}
