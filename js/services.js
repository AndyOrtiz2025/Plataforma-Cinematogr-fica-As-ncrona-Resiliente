/* =====================================================================
   services.js
   REQUISITO 1 DE LA TAREA — Orquestación concurrente resiliente.

   Simula 3 "backends" independientes:
     1. Catálogo de Películas   (CRÍTICO — si falla, no hay app)
     2. Reseñas de Usuarios     (opcional — puede fallar sin romper nada)
     3. Anuncios Promocionales  (opcional — puede fallar sin romper nada)

   loadHomeData() los consulta con Promise.allSettled, que a diferencia
   de Promise.all, NO se rechaza completo si una sola promesa falla:
   cada resultado trae { status: 'fulfilled' | 'rejected', ... } por
   separado, y así el catálogo se puede renderizar aunque Reseñas o
   Anuncios hayan fallado.
   ===================================================================== */

import { CONFIG, isApiConfigured, getLang } from './config.js';

/* -----------------------------------------------------------------
   Panel de depuración para el screencast: desde la consola del
   navegador puedes forzar que un servicio falle en vivo, ej:
     CINEGRID_DEBUG.forceReviewsError = true
     CINEGRID_DEBUG.forceAdsError = true
   ----------------------------------------------------------------- */
export const CINEGRID_DEBUG = {
  forceReviewsError: false,
  forceAdsError: false
};
if (typeof window !== 'undefined') window.CINEGRID_DEBUG = CINEGRID_DEBUG;

/* PASO 4 del laboratorio original: Promise envuelta en setTimeout. */
export function simulateNetworkLatency(dataFactory, ms = CONFIG.SIMULATED_LATENCY_MS) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(dataFactory());
      } catch (err) {
        reject(err);
      }
    }, ms);
  });
}

/* =====================================================================
   Datos simulados (fallback si no hay API Key configurada)
   ===================================================================== */
const MOCK_MOVIES = [
  { id: 1, title: 'Ecos de Neón', year: 2023, genreIds: [878, 53], rating: 8.1, posterSeed: 'neon-echoes', overview: 'Un detective sintético investiga una serie de asesinatos en una metrópolis donde la memoria se puede comprar y vender.' },
  { id: 2, title: 'La Última Butaca', year: 2019, genreIds: [18, 9648], rating: 7.6, posterSeed: 'last-seat', overview: 'El proyeccionista de un cine a punto de cerrar descubre un rollo de película que predice el futuro de sus espectadores.' },
  { id: 3, title: 'Risas de Medianoche', year: 2021, genreIds: [35], rating: 6.9, posterSeed: 'midnight-laughs', overview: 'Cuatro comediantes quedan encerrados en un club nocturno la noche de fin de año y deben improvisar para sobrevivir al amanecer.' },
  { id: 4, title: 'El Cartógrafo del Silencio', year: 2018, genreIds: [12, 14], rating: 8.4, posterSeed: 'cartographer', overview: 'Una cartógrafa traza mapas de lugares que no deberían existir, hasta que uno de ellos empieza a trazarla a ella.' },
  { id: 5, title: 'Fuego en el Archivo', year: 2022, genreIds: [80, 53], rating: 7.2, posterSeed: 'archive-fire', overview: 'Una archivista descubre documentos que implican a su propia familia en un encubrimiento de décadas.' },
  { id: 6, title: 'Vestigios', year: 2020, genreIds: [27, 9648], rating: 7.0, posterSeed: 'vestiges', overview: 'Un equipo de restauración encuentra algo más que humedad detrás del yeso de una casa centenaria.' },
  { id: 7, title: 'Órbita Baja', year: 2024, genreIds: [878, 12], rating: 8.7, posterSeed: 'low-orbit', overview: 'La tripulación de una estación espacial en desuso debe decidir quién regresa a casa cuando solo queda una cápsula.' },
  { id: 8, title: 'Cartas para Nadie', year: 2017, genreIds: [10749, 18], rating: 7.8, posterSeed: 'letters-nobody', overview: 'Una cartera rural entrega correspondencia de un remitente que lleva quince años muerto.' },
  { id: 9, title: 'El Peso del Bronce', year: 2016, genreIds: [18], rating: 7.4, posterSeed: 'bronze-weight', overview: 'Un escultor olvidado acepta una última comisión que lo obliga a confrontar la obra que lo hizo famoso.' },
  { id: 10, title: 'Frecuencia Fantasma', year: 2023, genreIds: [27, 878], rating: 6.8, posterSeed: 'ghost-frequency', overview: 'Un técnico de radio capta una señal que transmite eventos veinticuatro horas antes de que sucedan.' }
];

function normalizeTMDBMovie(raw) {
  return {
    id: raw.id,
    title: raw.title,
    year: (raw.release_date || '').slice(0, 4) || '—',
    genreIds: raw.genre_ids || [],
    rating: raw.vote_average ? Number(raw.vote_average.toFixed(1)) : null,
    posterPath: raw.poster_path,
    overview: raw.overview || 'Sin sinopsis disponible.'
  };
}

async function fetchFromTMDB({ query = '', genreId = '', year = '' } = {}) {
  let url;
  if (query) {
    url = new URL(`${CONFIG.BASE_URL}/search/movie`);
    url.searchParams.set('query', query);
    if (year) url.searchParams.set('year', year);
  } else {
    url = new URL(`${CONFIG.BASE_URL}/discover/movie`);
    url.searchParams.set('sort_by', 'popularity.desc');
    if (genreId) url.searchParams.set('with_genres', genreId);
    if (year) url.searchParams.set('primary_release_year', year);
  }
  url.searchParams.set('api_key', CONFIG.API_KEY);
  url.searchParams.set('language', getLang() === 'en' ? 'en-US' : 'es-ES');
  url.searchParams.set('include_adult', 'false');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB respondió ${res.status}`);
  const json = await res.json();
  let results = (json.results || []).map(normalizeTMDBMovie);

  if (genreId && query) {
    results = results.filter(m => m.genreIds.includes(Number(genreId)));
  }
  return results;
}

function fetchFromMock({ query = '', genreId = '', year = '' } = {}) {
  const q = query.trim().toLowerCase();
  return MOCK_MOVIES.filter(m => {
    const matchesQuery = !q || m.title.toLowerCase().includes(q);
    const matchesGenre = !genreId || m.genreIds.includes(Number(genreId));
    const matchesYear = !year || String(m.year) === String(year);
    return matchesQuery && matchesGenre && matchesYear;
  });
}

/* =====================================================================
   SERVICIO 1 — Catálogo de Películas (CRÍTICO)
   ===================================================================== */
export function fetchCatalogService(filters = {}) {
  const factory = isApiConfigured()
    ? () => fetchFromTMDB(filters)
    : () => fetchFromMock(filters);
  return simulateNetworkLatency(factory);
}

/* =====================================================================
   SERVICIO 2 — Reseñas de Usuarios (opcional, puede fallar)
   ===================================================================== */
export function fetchReviewsService() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (CINEGRID_DEBUG.forceReviewsError || Math.random() < CONFIG.SERVICE_FAILURE_RATE) {
        reject(new Error('Servicio de Reseñas no disponible (timeout simulado)'));
        return;
      }
      resolve({
        averageRating: (Math.random() * 2 + 7).toFixed(1),
        totalReviews: Math.floor(Math.random() * 500) + 50
      });
    }, 500 + Math.random() * 500);
  });
}

/* =====================================================================
   SERVICIO 3 — Anuncios Promocionales (opcional, puede fallar)
   ===================================================================== */
export function fetchAdsService() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (CINEGRID_DEBUG.forceAdsError || Math.random() < CONFIG.SERVICE_FAILURE_RATE) {
        reject(new Error('Servicio de Anuncios no disponible (timeout simulado)'));
        return;
      }
      resolve({ banner: '🍿 Estreno especial esta semana — 2x1 en boletos' });
    }, 400 + Math.random() * 500);
  });
}

/* =====================================================================
   ORQUESTACIÓN RESILIENTE — Promise.allSettled
   Las 3 llamadas salen en paralelo. Si Reseñas o Anuncios fallan, el
   catálogo se sigue mostrando con normalidad (degradación con gracia).
   ===================================================================== */
export async function loadHomeData(filters) {
  const [catalogResult, reviewsResult, adsResult] = await Promise.allSettled([
    fetchCatalogService(filters),
    fetchReviewsService(),
    fetchAdsService()
  ]);

  // El catálogo SÍ es crítico: sin él, no hay nada que mostrar.
  if (catalogResult.status === 'rejected') {
    throw catalogResult.reason;
  }

  return {
    movies: catalogResult.value,
    reviews: reviewsResult.status === 'fulfilled' ? reviewsResult.value : null,
    reviewsError: reviewsResult.status === 'rejected' ? reviewsResult.reason.message : null,
    ads: adsResult.status === 'fulfilled' ? adsResult.value : null,
    adsError: adsResult.status === 'rejected' ? adsResult.reason.message : null
  };
}
