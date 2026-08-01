/* =====================================================================
   mappers/reviewsMapper.ts
   Traduce el DTO crudo de Reseñas (averageRating como string) a la
   Entity limpia (averageRating como number).
   ===================================================================== */

import type { ReviewsServiceDTO } from '../dtos/reviewsDTO.js';
import type { ReviewsEntity } from '../entities/reviewsEntity.js';

export function mapReviewsToEntity(dto: ReviewsServiceDTO): ReviewsEntity {
  return {
    averageRating: Number(dto.averageRating),
    totalReviews: dto.totalReviews
  };
}
