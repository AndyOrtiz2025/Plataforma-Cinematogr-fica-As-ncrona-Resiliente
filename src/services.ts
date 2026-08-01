/* =====================================================================
   services.ts
   Simula 3 "backends" independientes: Catálogo (crítico), Reseñas y
   Anuncios (opcionales). Aquí es donde el patrón DTO → Mapper → Entity
   se pone en práctica: cada servicio entrega su DTO crudo, y antes de
   devolverlo al resto de la app lo pasamos por su mapper.
   ===================================================================== */

import { CONFIG, isApiConfigured, getLang } from './config.js';
import type { TMDBMovieDTO, TMDBResponseDTO, MockMovieDTO } from './dtos/catalogDTO.js';
import type { ReviewsServiceDTO } from './dtos/reviewsDTO.js';
import type { AdsServiceDTO } from './dtos/adsDTO.js';
import type { MovieEntity } from './entities/movieEntity.js';
import type { ReviewsEntity } from './entities/reviewsEntity.js';
import type { AdEntity } from './entities/adsEntity.js';
import { mapTMDBMovieToEntity, mapMockMovieToEntity } from './mappers/movieMapper.js';
import { mapReviewsToEntity } from './mappers/reviewsMapper.js';
import { mapAdsToEntity } from './mappers/adsMapper.js';

/* -----------------------------------------------------------------
   Panel de depuración: desde la consola del navegador se puede forzar
   que un servicio falle en vivo, ej: CINEGRID_DEBUG.forceAdsError = true
   ----------------------------------------------------------------- */
export interface DebugFlags {
  forceReviewsError: boolean;
  forceAdsError: boolean;
}

declare global {
  interface Window {
    CINEGRID_DEBUG: DebugFlags;
  }
}

export const CINEGRID_DEBUG: DebugFlags = {
  forceReviewsError: false,
  forceAdsError: false
};
window.CINEGRID_DEBUG = CINEGRID_DEBUG;

/* Promise envuelta en setTimeout — simula latencia de red.
   Acepta una factory síncrona (T) o asíncrona (Promise<T>) — cubre
   tanto el catálogo mock (síncrono) como TMDB (asíncrono) sin
   duplicar lógica ni anidar promesas por accidente. */
export function simulateNetworkLatency<T>(
  dataFactory: () => T | Promise<T>,
  ms: number = CONFIG.SIMULATED_LATENCY_MS
): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      Promise.resolve()
        .then(() => dataFactory())
        .then(resolve)
        .catch((err: unknown) => reject(err instanceof Error ? err : new Error(String(err))));
    }, ms);
  });
}

/* =====================================================================
   Catálogo simulado (fallback sin API Key) — DTO crudo
   ===================================================================== */
const MOCK_MOVIES: MockMovieDTO[] = [
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

export interface CatalogFilters {
  query?: string;
  genreId?: string;
  year?: string;
}

async function fetchFromTMDB({ query = '', genreId = '', year = '' }: CatalogFilters): Promise<MovieEntity[]> {
  let url: URL;
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

  // DTO crudo, tal como lo entrega TMDB
  const json = (await res.json()) as TMDBResponseDTO;
  const rawResults: TMDBMovieDTO[] = json.results ?? [];

  // Mapper: DTO crudo → Entity limpia
  let results: MovieEntity[] = rawResults.map(mapTMDBMovieToEntity);

  if (genreId && query) {
    results = results.filter(m => m.genreIds.includes(Number(genreId)));
  }
  return results;
}

function fetchFromMock({ query = '', genreId = '', year = '' }: CatalogFilters): MovieEntity[] {
  const q = query.trim().toLowerCase();
  return MOCK_MOVIES
    .filter(m => {
      const matchesQuery = !q || m.title.toLowerCase().includes(q);
      const matchesGenre = !genreId || m.genreIds.includes(Number(genreId));
      const matchesYear = !year || String(m.year) === String(year);
      return matchesQuery && matchesGenre && matchesYear;
    })
    .map(mapMockMovieToEntity); // Mapper: DTO crudo → Entity limpia
}

/* SERVICIO 1 — Catálogo de Películas (CRÍTICO) */
export function fetchCatalogService(filters: CatalogFilters = {}): Promise<MovieEntity[]> {
  return isApiConfigured()
    ? simulateNetworkLatency(() => fetchFromTMDB(filters))
    : simulateNetworkLatency(() => fetchFromMock(filters));
}

/* SERVICIO 2 — Reseñas de Usuarios (opcional, puede fallar) */
export function fetchReviewsService(): Promise<ReviewsEntity> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (CINEGRID_DEBUG.forceReviewsError || Math.random() < CONFIG.SERVICE_FAILURE_RATE) {
        reject(new Error('Servicio de Reseñas no disponible (timeout simulado)'));
        return;
      }
      const dto: ReviewsServiceDTO = {
        averageRating: (Math.random() * 2 + 7).toFixed(1),
        totalReviews: Math.floor(Math.random() * 500) + 50
      };
      resolve(mapReviewsToEntity(dto)); // Mapper: DTO crudo → Entity limpia
    }, 500 + Math.random() * 500);
  });
}

/* SERVICIO 3 — Anuncios Promocionales (opcional, puede fallar) */
export function fetchAdsService(): Promise<AdEntity> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (CINEGRID_DEBUG.forceAdsError || Math.random() < CONFIG.SERVICE_FAILURE_RATE) {
        reject(new Error('Servicio de Anuncios no disponible (timeout simulado)'));
        return;
      }
      const dto: AdsServiceDTO = { banner: '🍿 Estreno especial esta semana — 2x1 en boletos' };
      resolve(mapAdsToEntity(dto)); // Mapper: DTO crudo → Entity limpia
    }, 400 + Math.random() * 500);
  });
}

export interface HomeData {
  movies: MovieEntity[];
  reviews: ReviewsEntity | null;
  reviewsError: string | null;
  ads: AdEntity | null;
  adsError: string | null;
}

/* ORQUESTACIÓN RESILIENTE — Promise.allSettled */
export async function loadHomeData(filters: CatalogFilters): Promise<HomeData> {
  const [catalogResult, reviewsResult, adsResult] = await Promise.allSettled([
    fetchCatalogService(filters),
    fetchReviewsService(),
    fetchAdsService()
  ]);

  if (catalogResult.status === 'rejected') {
    throw catalogResult.reason instanceof Error
      ? catalogResult.reason
      : new Error(String(catalogResult.reason));
  }

  return {
    movies: catalogResult.value,
    reviews: reviewsResult.status === 'fulfilled' ? reviewsResult.value : null,
    reviewsError: reviewsResult.status === 'rejected'
      ? (reviewsResult.reason instanceof Error ? reviewsResult.reason.message : String(reviewsResult.reason))
      : null,
    ads: adsResult.status === 'fulfilled' ? adsResult.value : null,
    adsError: adsResult.status === 'rejected'
      ? (adsResult.reason instanceof Error ? adsResult.reason.message : String(adsResult.reason))
      : null
  };
}
