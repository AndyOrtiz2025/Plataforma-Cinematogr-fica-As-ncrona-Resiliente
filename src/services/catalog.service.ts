/* =====================================================================
   services/catalog.service.ts
   Servicio de Catálogo (CRÍTICO). Decide qué endpoint real de TMDB
   consultar según los filtros activos, y mapea el resultado a
   MovieEntity antes de entregarlo al resto de la app.
   ===================================================================== */

import { getPopularMovies, getMoviesByGenre, searchMovies } from './tmdb.service.js';
import { mapMovieToEntity } from '../mappers/movie.mapper.js';
import type { MovieEntity } from '../entities/movie.entity.js';

export interface CatalogFilters {
  query?: string;
  genreId?: string;
  year?: string;
}

export async function getCatalog(filters: CatalogFilters = {}): Promise<MovieEntity[]> {
  const { query, genreId, year } = filters;

  const dtos = query
    ? await searchMovies(query, year)
    : genreId
      ? await getMoviesByGenre(genreId, year)
      : await getPopularMovies();

  return dtos.map(mapMovieToEntity);
}
