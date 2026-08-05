/* =====================================================================
   mappers/movie.mapper.ts

   REQUISITO 2 — Robustez ante contratos incompletos con Utility Types.

   La API puede regresar payloads a medias (un título sin año, un
   poster nulo, etc.). En vez de que la app truene, aceptamos
   Partial<MovieDTO> — todos los campos opcionales — y rellenamos
   cualquier ausencia con valores de negocio por defecto.
   ===================================================================== */

import type { MovieDTO } from '../dtos/movie.dto.js';
import type { MovieEntity } from '../entities/movie.entity.js';

const DEFAULTS = {
  title: 'Título no disponible',
  year: '—',
  overview: 'Sin sinopsis disponible.'
} as const;

/**
 * Acepta un DTO PARCIAL (Partial<MovieDTO>) — cualquier campo puede
 * venir ausente o nulo — y siempre regresa una MovieEntity completa
 * y segura de usar en el resto de la app.
 */
export function mapPartialMovieToEntity(dto: Partial<MovieDTO>): MovieEntity {
  return {
    id: dto.id ?? 0,
    title: dto.title ?? DEFAULTS.title,
    year: (dto.release_date ?? '').slice(0, 4) || DEFAULTS.year,
    genreIds: dto.genre_ids ?? [],
    rating: dto.vote_average ? Number(dto.vote_average.toFixed(1)) : null,
    posterPath: dto.poster_path ?? null,
    overview: dto.overview || DEFAULTS.overview,
    contentType: 'movie'
  };
}

/** Para DTOs completos (el caso normal) — reutiliza la misma lógica. */
export function mapMovieToEntity(dto: MovieDTO): MovieEntity {
  return mapPartialMovieToEntity(dto);
}

/* =====================================================================
   Utility Types en uso real dentro de la app (no solo de adorno):
   ===================================================================== */

/**
 * PICK: solo los campos que de verdad necesita una tarjeta en el
 * grid o el panel de favoritos — no hace falta cargar `overview`
 * completo en memoria para pintar una miniatura.
 */
export type MovieCardFields = Pick<
  MovieEntity,
  'id' | 'title' | 'year' | 'genreIds' | 'rating' | 'posterPath'
>;

/**
 * OMIT + PARTIAL combinados: el payload seguro para actualizar una
 * película ya guardada — todo opcional, y nunca se permite tocar
 * `id` ni `contentType` (esos son inmutables una vez creada la
 * entidad). Se usa junto con DataCatalogManager.update().
 */
export type MovieUpdatePayload = Partial<Omit<MovieEntity, 'id' | 'contentType'>>;
