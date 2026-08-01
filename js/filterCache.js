/* =====================================================================
   filterCache.js
   REQUISITO 2 DE LA TAREA — Caché asíncrono encapsulado por clausura.

   createFilterCache() regresa un objeto con un método `getByGenre()`.
   Internamente encapsula un objeto `cache` que actúa como caché en
   memoria — es una variable PRIVADA, invisible fuera de este closure.

   Comportamiento:
   - 1ra vez que se pide el género "Acción" → no existe en cache →
     se ejecuta la promesa asíncrona real (fetchFn), con su latencia
     simulada, y el resultado se guarda en cache.
   - 2da vez que se pide "Acción" → ya existe en cache → se regresa
     de inmediato, SIN volver a disparar la promesa/latencia.
   ===================================================================== */

export function createFilterCache(fetchFn) {
  const cache = {}; // objeto privado — el "caché en memoria" del enunciado

  return {
    async getByGenre(genreId) {
      const key = genreId || 'all';

      if (Object.prototype.hasOwnProperty.call(cache, key)) {
        console.log(`⚡ [FilterCache] HIT para género "${key}" — se sirve sin red`);
        return { movies: cache[key], fromCache: true };
      }

      console.log(`🌐 [FilterCache] MISS para género "${key}" — consultando servicio…`);
      const movies = await fetchFn(genreId);
      cache[key] = movies;
      return { movies, fromCache: false };
    },

    // Consulta si un género YA está en caché, sin exponer los datos
    // ni el objeto interno — solo un booleano. Mantiene el closure privado.
    has(genreId) {
      const key = genreId || 'all';
      return Object.prototype.hasOwnProperty.call(cache, key);
    },

    clear() {
      Object.keys(cache).forEach(k => delete cache[k]);
      console.log('🧹 [FilterCache] Caché limpiado manualmente');
    },

    size() {
      return Object.keys(cache).length;
    }
  };
}
