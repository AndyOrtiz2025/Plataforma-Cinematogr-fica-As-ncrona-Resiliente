/* =====================================================================
   favorites.js
   Closure que encapsula el estado privado de favoritos. Ninguna otra
   parte del código (ni la consola del navegador) puede tocar la
   variable `favorites` directamente — solo mediante los métodos
   que este factory expone.
   ===================================================================== */

export function createFavoritesManager() {
  let favorites = new Map(); // <- variable privada, vive en el closure

  try {
    const saved = JSON.parse(localStorage.getItem('cinegrid_favorites') || '[]');
    saved.forEach(m => favorites.set(m.id, m));
  } catch (e) {
    // localStorage no disponible o corrupto: iniciamos vacío
  }

  function persist() {
    localStorage.setItem('cinegrid_favorites', JSON.stringify([...favorites.values()]));
  }

  return {
    toggle(movie) {
      if (favorites.has(movie.id)) {
        favorites.delete(movie.id);
      } else {
        favorites.set(movie.id, movie);
      }
      persist();
      return favorites.has(movie.id);
    },
    has(id) { return favorites.has(id); },
    getCount() { return favorites.size; },
    getAll() { return [...favorites.values()]; }
  };
}
