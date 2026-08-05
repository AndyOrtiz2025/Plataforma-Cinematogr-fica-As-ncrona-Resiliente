/* =====================================================================
   favorites.ts
   Closure que encapsula el estado privado de favoritos. Ninguna otra
   parte del código (ni la consola del navegador) puede tocar la
   variable `favorites` directamente — solo mediante los métodos
   que este factory expone.

   Acepta CatalogEntity (Movie | Series | Documentary) — un favorito
   puede ser cualquiera de los 3 tipos — pero solo GUARDA los campos
   que de verdad hacen falta (CatalogCardFields, un Pick<...>).
   ===================================================================== */

import type { CatalogEntity, CatalogCardFields } from './entities/catalog-entity.js';

function toCardFields(item: CatalogEntity): CatalogCardFields {
  const { id, title, year, genreIds, rating, posterPath } = item;
  return { id, title, year, genreIds, rating, posterPath };
}

export interface FavoritesManager {
  toggle(item: CatalogEntity): boolean;
  has(id: CatalogEntity['id']): boolean;
  getCount(): number;
  getAll(): CatalogCardFields[];
}

export function createFavoritesManager(): FavoritesManager {
  const favorites = new Map<CatalogEntity['id'], CatalogCardFields>(); // <- privada, vive en el closure

  try {
    const raw = localStorage.getItem('cinegrid_favorites') ?? '[]';
    const saved = JSON.parse(raw) as CatalogCardFields[];
    saved.forEach(m => favorites.set(m.id, m));
  } catch {
    // localStorage no disponible o corrupto: iniciamos vacío
  }

  function persist(): void {
    localStorage.setItem('cinegrid_favorites', JSON.stringify([...favorites.values()]));
  }

  return {
    toggle(item: CatalogEntity): boolean {
      if (favorites.has(item.id)) {
        favorites.delete(item.id);
      } else {
        favorites.set(item.id, toCardFields(item));
      }
      persist();
      return favorites.has(item.id);
    },
    has(id: CatalogEntity['id']): boolean {
      return favorites.has(id);
    },
    getCount(): number {
      return favorites.size;
    },
    getAll(): CatalogCardFields[] {
      return [...favorites.values()];
    }
  };
}
