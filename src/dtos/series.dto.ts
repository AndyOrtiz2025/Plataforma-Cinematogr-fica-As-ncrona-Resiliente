/* =====================================================================
   dtos/series.dto.ts
   Forma CRUDA de una serie tal como la entrega TMDB (endpoint /tv).
   ===================================================================== */

export interface SeriesDTO {
  id: number;
  name: string; // TMDB usa "name" para series, no "title"
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  poster_path?: string | null;
  overview?: string;
}

export interface SeriesResponseDTO {
  results: SeriesDTO[];
}
