/* =====================================================================
   favorites.ts
   Closure que encapsula el estado privado de favoritos. Ninguna otra
   parte del código (ni la consola del navegador) puede tocar la
   variable `favorites` directamente — solo mediante los métodos
   que este factory expone.
   ===================================================================== */

import type { MovieEntity } from './entities/movieEntity.js';

export interface FavoritesManager {
  toggle(movie: MovieEntity): boolean;
  has(id: MovieEntity['id']): boolean;
  getCount(): number;
  getAll(): MovieEntity[];
}

export function createFavoritesManager(): FavoritesManager {
  const favorites = new Map<MovieEntity['id'], MovieEntity>(); // <- privada, vive en el closure

  try {
    const raw = localStorage.getItem('cinegrid_favorites') ?? '[]';
    const saved = JSON.parse(raw) as MovieEntity[];
    saved.forEach(m => favorites.set(m.id, m));
  } catch {
    // localStorage no disponible o corrupto: iniciamos vacío
  }

  function persist(): void {
    localStorage.setItem('cinegrid_favorites', JSON.stringify([...favorites.values()]));
  }

  return {
    toggle(movie: MovieEntity): boolean {
      if (favorites.has(movie.id)) {
        favorites.delete(movie.id);
      } else {
        favorites.set(movie.id, movie);
      }
      persist();
      return favorites.has(movie.id);
    },
    has(id: MovieEntity['id']): boolean {
      return favorites.has(id);
    },
    getCount(): number {
      return favorites.size;
    },
    getAll(): MovieEntity[] {
      return [...favorites.values()];
    }
  };
}
