/* =====================================================================
   mappers/reviews.mapper.ts
   Traduce el DTO crudo de Reseñas a la Entity limpia.
   ===================================================================== */

import type { ReviewsDTO } from '../dtos/reviews.dto.js';
import type { ReviewsEntity } from '../entities/reviews.entity.js';

export function mapReviewsToEntity(dto: ReviewsDTO): ReviewsEntity {
  return {
    averageRating: Number(dto.averageRating),
    totalReviews: dto.totalReviews
  };
}
