/* =====================================================================
   filterCache.ts
   Caché asíncrono encapsulado por clausura. `cache` es un objeto
   PRIVADO — invisible fuera de este closure, solo accesible a través
   de los métodos que se retornan.

   Se usa <T> genérico para poder tipar exactamente qué guarda cada
   instancia (en nuestro caso, MovieEntity[]).
   ===================================================================== */

export interface FilterCache<T> {
  getByGenre(genreId: string): Promise<{ movies: T; fromCache: boolean }>;
  has(genreId: string): boolean;
  clear(): void;
  size(): number;
}

export function createFilterCache<T>(
  fetchFn: (genreId: string) => Promise<T>
): FilterCache<T> {
  const cache: Record<string, T> = {}; // objeto privado — el "caché en memoria"

  return {
    async getByGenre(genreId: string) {
      const key = genreId || 'all';

      if (Object.prototype.hasOwnProperty.call(cache, key)) {
        console.log(`⚡ [FilterCache] HIT para género "${key}" — se sirve sin red`);
        return { movies: cache[key] as T, fromCache: true };
      }

      console.log(`🌐 [FilterCache] MISS para género "${key}" — consultando servicio…`);
      const movies = await fetchFn(genreId);
      cache[key] = movies;
      return { movies, fromCache: false };
    },

    has(genreId: string): boolean {
      const key = genreId || 'all';
      return Object.prototype.hasOwnProperty.call(cache, key);
    },

    clear(): void {
      Object.keys(cache).forEach(k => delete cache[k]);
      console.log('🧹 [FilterCache] Caché limpiado manualmente');
    },

    size(): number {
      return Object.keys(cache).length;
    }
  };
}
