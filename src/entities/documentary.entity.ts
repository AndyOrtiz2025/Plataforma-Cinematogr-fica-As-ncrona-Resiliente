/* =====================================================================
   entities/documentary.entity.ts
   Forma LIMPIA de un documental. Viene del mismo endpoint de
   películas de TMDB (filtrado por el género "Documentary"), pero se
   modela como un tipo propio para demostrar que DataCatalogManager<T>
   funciona igual de bien con un tercer tipo distinto.
   ===================================================================== */

export interface DocumentaryEntity {
  id: number;
  title: string;
  year: string;
  genreIds: number[];
  rating: number | null;
  posterPath: string | null;
  overview: string;
  contentType: 'documentary';
}
