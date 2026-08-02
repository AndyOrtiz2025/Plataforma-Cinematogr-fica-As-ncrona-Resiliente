/* =====================================================================
   mappers/movie.mapper.ts
   Traduce el DTO crudo de TMDB a la MovieEntity limpia.
   ===================================================================== */

import type { MovieDTO } from '../dtos/movie.dto.js';
import type { MovieEntity } from '../entities/movie.entity.js';

export function mapMovieToEntity(dto: MovieDTO): MovieEntity {
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
