/* =====================================================================
   entities/movie.entity.ts
   Forma LIMPIA de una película, ya saneada — la que usa el resto de
   la aplicación (render, modal, favoritos, caché).
   ===================================================================== */

export interface MovieEntity {
  id: number;
  title: string;
  year: string;
  genreIds: number[];
  rating: number | null;
  posterPath: string | null;
  overview: string;
}
