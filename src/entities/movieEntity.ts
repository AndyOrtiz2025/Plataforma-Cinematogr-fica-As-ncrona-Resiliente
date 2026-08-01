/* =====================================================================
   entities/movieEntity.ts
   Forma LIMPIA de una película, ya saneada — es la que usa el resto
   de la aplicación (render, modal, favoritos, caché), sin importar
   si el dato original vino de TMDB o del catálogo simulado.
   ===================================================================== */

export interface MovieEntity {
  id: number | string;
  title: string;
  year: string | number;
  genreIds: number[];
  rating: number | null;
  posterPath: string | null;
  posterSeed?: string;
  overview: string;
}
