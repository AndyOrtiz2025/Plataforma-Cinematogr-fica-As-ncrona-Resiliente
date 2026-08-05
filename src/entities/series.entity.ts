/* =====================================================================
   entities/series.entity.ts
   Forma LIMPIA de una serie — misma "forma" de campos que MovieEntity
   a propósito, para que el mismo DataCatalogManager<T> y las mismas
   funciones de render puedan reutilizarse sin cambios.
   ===================================================================== */

export interface SeriesEntity {
  id: number;
  title: string;
  year: string;
  genreIds: number[];
  rating: number | null;
  posterPath: string | null;
  overview: string;
  contentType: 'series';
}
