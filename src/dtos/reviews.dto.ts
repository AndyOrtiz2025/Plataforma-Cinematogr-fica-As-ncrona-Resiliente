/* =====================================================================
   dtos/reviews.dto.ts
   Forma cruda tal como la entrega el servicio simulado de Reseñas.
   ===================================================================== */

export interface ReviewsDTO {
  averageRating: string; // el servicio lo entrega como texto, ej. "8.3"
  totalReviews: number;
}
