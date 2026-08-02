/* =====================================================================
   services/orchestrator.service.ts
   Orquestación concurrente resiliente. Junta los 3 servicios
   (Catálogo, Reseñas, Anuncios) con Promise.allSettled — a diferencia
   de Promise.all, no se rechaza completo si uno de los tres falla.
   ===================================================================== */

import { getCatalog, type CatalogFilters } from './catalog.service.js';
import { getReviews } from './reviews.service.js';
import { getAds } from './ads.service.js';
import type { MovieEntity } from '../entities/movie.entity.js';
import type { ReviewsEntity } from '../entities/reviews.entity.js';
import type { AdEntity } from '../entities/ads.entity.js';

export interface HomeData {
  movies: MovieEntity[];
  reviews: ReviewsEntity | null;
  reviewsError: string | null;
  ads: AdEntity | null;
  adsError: string | null;
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

export async function loadHomeData(filters: CatalogFilters): Promise<HomeData> {
  const [catalogResult, reviewsResult, adsResult] = await Promise.allSettled([
    getCatalog(filters),
    getReviews(),
    getAds()
  ]);

  // El catálogo SÍ es crítico: viene de la API real, y sin él no hay
  // nada que mostrar — por eso, si falla, se propaga el error.
  if (catalogResult.status === 'rejected') {
    throw catalogResult.reason instanceof Error
      ? catalogResult.reason
      : new Error(errorMessage(catalogResult.reason));
  }

  return {
    movies: catalogResult.value,
    reviews: reviewsResult.status === 'fulfilled' ? reviewsResult.value : null,
    reviewsError: reviewsResult.status === 'rejected' ? errorMessage(reviewsResult.reason) : null,
    ads: adsResult.status === 'fulfilled' ? adsResult.value : null,
    adsError: adsResult.status === 'rejected' ? errorMessage(adsResult.reason) : null
  };
}
