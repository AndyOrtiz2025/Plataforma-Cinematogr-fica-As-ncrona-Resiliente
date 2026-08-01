/* =====================================================================
   mappers/movieMapper.ts
   Funciones puras que traducen los DTOs crudos del Catálogo (TMDB o
   mock) a la forma limpia MovieEntity que usa el resto de la app.
   ===================================================================== */

import type { TMDBMovieDTO, MockMovieDTO } from '../dtos/catalogDTO.js';
import type { MovieEntity } from '../entities/movieEntity.js';

export function mapTMDBMovieToEntity(dto: TMDBMovieDTO): MovieEntity {
  return {
    id: dto.id,
    title: dto.title,
    year: (dto.release_date ?? '').slice(0, 4) || '—',
    genreIds: dto.genre_ids ?? [],
    rating: dto.vote_average ? Number(dto.vote_average.toFixed(1)) : null,
    posterPath: dto.poster_path ?? null,
    overview: dto.overview || 'Sin sinopsis disponible.'
  };
}

export function mapMockMovieToEntity(dto: MockMovieDTO): MovieEntity {
  return {
    id: dto.id,
    title: dto.title,
    year: dto.year,
    genreIds: dto.genreIds,
    rating: dto.rating,
    posterPath: null,
    posterSeed: dto.posterSeed,
    overview: dto.overview
  };
}
