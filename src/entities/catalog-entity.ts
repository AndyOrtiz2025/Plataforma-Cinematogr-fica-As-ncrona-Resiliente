/* =====================================================================
   entities/catalog-entity.ts
   Unión discriminada de los 3 tipos de contenido que maneja la app.
   Permite que funciones como el render acepten cualquiera de los 3
   sin duplicar código, y que TypeScript siga distinguiéndolos por
   su campo `contentType` si hiciera falta.
   ===================================================================== */

import type { MovieEntity } from './movie.entity.js';
import type { SeriesEntity } from './series.entity.js';
import type { DocumentaryEntity } from './documentary.entity.js';

export type CatalogEntity = MovieEntity | SeriesEntity | DocumentaryEntity;

/** Campos comunes a los 3 tipos — los únicos que necesita, por
    ejemplo, el panel de favoritos o una tarjeta del grid. */
export type CatalogCardFields = Pick<
  CatalogEntity,
  'id' | 'title' | 'year' | 'genreIds' | 'rating' | 'posterPath'
>;
