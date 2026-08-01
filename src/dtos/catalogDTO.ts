/* =====================================================================
   dtos/catalogDTO.ts
   Formas CRUDAS tal como llegan desde cada fuente del servicio de
   Catálogo — antes de cualquier limpieza/adaptación.
   ===================================================================== */

/** Forma cruda de un elemento devuelto por /search o /discover de TMDB. */
export interface TMDBMovieDTO {
  id: number;
  title: string;
  release_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  poster_path?: string | null;
  overview?: string;
}

/** Forma cruda de la respuesta completa de la API de TMDB. */
export interface TMDBResponseDTO {
  results: TMDBMovieDTO[];
}

/** Forma cruda del catálogo de datos simulados (fallback sin API Key). */
export interface MockMovieDTO {
  id: number;
  title: string;
  year: number;
  genreIds: number[];
  rating: number;
  posterSeed: string;
  overview: string;
}
