/* =====================================================================
   dtos/movie.dto.ts
   Forma CRUDA de una película tal como la entrega TMDB — antes de
   cualquier limpieza/adaptación.
   ===================================================================== */

export interface MovieDTO {
  id: number;
  title: string;
  release_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  poster_path?: string | null;
  overview?: string;
}

export interface MoviesResponseDTO {
  results: MovieDTO[];
}

export interface GenreDTO {
  id: number;
  name: string;
}

export interface GenresResponseDTO {
  genres: GenreDTO[];
}
