/* =====================================================================
   entities/reviewsEntity.ts
   Forma LIMPIA de las reseñas — el averageRating ya es number, no
   string como venía en el DTO crudo.
   ===================================================================== */

export interface ReviewsEntity {
  averageRating: number;
  totalReviews: number;
}
