/* =====================================================================
   services/tmdb.service.ts
   Este archivo SOLO contiene llamadas reales a la API de TMDB.
   No hay ningún dato simulado ni "modo demo" aquí — si la API falla,
   el error se propaga tal cual, sin taparlo con datos falsos.
   ===================================================================== */

import { CONFIG, getLang } from '../config.js';
import type { MovieDTO, MoviesResponseDTO, GenresResponseDTO } from '../dtos/movie.dto.js';

function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${CONFIG.BASE_URL}${path}`);
  url.searchParams.set('api_key', CONFIG.API_KEY);
  url.searchParams.set('language', getLang() === 'en' ? 'en-US' : 'es-ES');
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

export async function getGenres(): Promise<Map<number, string>> {
  const url = buildUrl('/genre/movie/list', {});
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB respondió ${res.status} al pedir géneros`);
  const data = (await res.json()) as GenresResponseDTO;

  const map = new Map<number, string>();
  data.genres.forEach(g => map.set(g.id, g.name));
  return map;
}

export async function getPopularMovies(): Promise<MovieDTO[]> {
  const url = buildUrl('/movie/popular', { page: '1' });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB respondió ${res.status} al pedir populares`);
  const data = (await res.json()) as MoviesResponseDTO;
  return data.results;
}

export async function getMoviesByGenre(genreId: string, year?: string): Promise<MovieDTO[]> {
  const url = buildUrl('/discover/movie', {
    with_genres: genreId,
    primary_release_year: year ?? '',
    sort_by: 'popularity.desc'
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB respondió ${res.status} al filtrar por género`);
  const data = (await res.json()) as MoviesResponseDTO;
  return data.results;
}

export async function searchMovies(query: string, year?: string): Promise<MovieDTO[]> {
  const url = buildUrl('/search/movie', { query, year: year ?? '' });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB respondió ${res.status} al buscar "${query}"`);
  const data = (await res.json()) as MoviesResponseDTO;
  return data.results;
}

export async function getMovieDetail(id: number): Promise<MovieDTO> {
  const url = buildUrl(`/movie/${id}`, {});
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB respondió ${res.status} al pedir el detalle de la película ${id}`);
  return (await res.json()) as MovieDTO;
}
