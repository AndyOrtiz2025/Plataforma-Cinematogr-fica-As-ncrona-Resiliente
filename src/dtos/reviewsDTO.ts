/* =====================================================================
   dtos/reviewsDTO.ts
   Forma cruda tal como la entrega el servicio simulado de Reseñas.
   ===================================================================== */

export interface ReviewsServiceDTO {
  averageRating: string; // el servicio lo entrega como texto, ej. "8.3"
  totalReviews: number;
}
