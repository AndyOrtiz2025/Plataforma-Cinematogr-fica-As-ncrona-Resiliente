/* =====================================================================
   mappers/series.mapper.ts
   Traduce el DTO crudo de TMDB (/tv) a la SeriesEntity limpia. Acepta
   Partial<SeriesDTO> por la misma razón que el mapper de películas:
   tolerar payloads incompletos sin romper la app.
   ===================================================================== */

import type { SeriesDTO } from '../dtos/series.dto.js';
import type { SeriesEntity } from '../entities/series.entity.js';

export function mapSeriesToEntity(dto: Partial<SeriesDTO>): SeriesEntity {
  return {
    id: dto.id ?? 0,
    title: dto.name ?? 'Título no disponible',
    year: (dto.first_air_date ?? '').slice(0, 4) || '—',
    genreIds: dto.genre_ids ?? [],
    rating: dto.vote_average ? Number(dto.vote_average.toFixed(1)) : null,
    posterPath: dto.poster_path ?? null,
    overview: dto.overview || 'Sin sinopsis disponible.',
    contentType: 'series'
  };
}
