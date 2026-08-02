/* =====================================================================
   services/reviews.service.ts
   Servicio SIMULADO de Reseñas (opcional — puede fallar sin romper
   el catálogo principal). Se declara aparte del catálogo real a
   propósito: es una fuente de datos totalmente independiente.
   ===================================================================== */

import { CONFIG } from '../config.js';
import { CINEGRID_DEBUG } from './debug.service.js';
import type { ReviewsDTO } from '../dtos/reviews.dto.js';
import type { ReviewsEntity } from '../entities/reviews.entity.js';
import { mapReviewsToEntity } from '../mappers/reviews.mapper.js';

export function getReviews(): Promise<ReviewsEntity> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (CINEGRID_DEBUG.forceReviewsError || Math.random() < CONFIG.SERVICE_FAILURE_RATE) {
        reject(new Error('Servicio de Reseñas no disponible (timeout simulado)'));
        return;
      }
      const dto: ReviewsDTO = {
        averageRating: (Math.random() * 2 + 7).toFixed(1),
        totalReviews: Math.floor(Math.random() * 500) + 50
      };
      resolve(mapReviewsToEntity(dto));
    }, 500 + Math.random() * 500);
  });
}
