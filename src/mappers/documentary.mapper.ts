/* =====================================================================
   mappers/documentary.mapper.ts
   Los documentales vienen del mismo endpoint de películas de TMDB
   (filtrado por género "Documentary"), así que reutilizamos el
   saneamiento de mapPartialMovieToEntity y solo le cambiamos la
   etiqueta de tipo. Al desestructurar y quitar `contentType`, el
   tipo de `rest` es automáticamente Omit<MovieEntity, 'contentType'>.
   ===================================================================== */

import type { MovieDTO } from '../dtos/movie.dto.js';
import type { DocumentaryEntity } from '../entities/documentary.entity.js';
import { mapPartialMovieToEntity } from './movie.mapper.js';

export function mapDocumentaryToEntity(dto: Partial<MovieDTO>): DocumentaryEntity {
  const { contentType, ...rest } = mapPartialMovieToEntity(dto);
  void contentType; // descartamos el tag "movie" — equivalente a Omit<MovieEntity, 'contentType'>
  return { ...rest, contentType: 'documentary' };
}
