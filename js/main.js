/* =====================================================================
   main.js — Punto de entrada de la aplicación.
   Importa todos los módulos y conecta el DOM con la lógica.
   ===================================================================== */

import { CONFIG, GENRES, isApiConfigured, getLang, setLang, t } from './config.js';
import { createFavoritesManager } from './favorites.js';
import { createFilterCache } from './filterCache.js';
import { fetchCatalogService, loadHomeData } from './services.js';
import { renderGallery, populateGenreSelect, getPosterUrl } from './render.js';
import { openMovieModal, closeModal } from './modal.js';

/* ------------------------- Referencias al DOM ------------------------- */
const els = {
  grid: document.getElementById('movieGrid'),
  filmLeader: document.getElementById('filmLeader'),
  leaderNumber: document.getElementById('leaderNumber'),
  emptyState: document.getElementById('emptyState'),
  statusLine: document.getElementById('statusLine'),
  searchInput: document.getElementById('searchInput'),
  genreSelect: document.getElementById('genreSelect'),
  yearInput: document.getElementById('yearInput'),
  searchBtn: document.getElementById('searchBtn'),
  favToggleBtn: document.getElementById('favToggleBtn'),
  favPanel: document.getElementById('favPanel'),
  favPanelHandle: document.getElementById('favPanelHandle'),
  favPanelBody: document.getElementById('favPanelBody'),
  favCount: document.getElementById('favCount'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  modalContent: document.getElementById('modalContent'),
  modalClose: document.getElementById('modalClose'),
  langToggleBtn: document.getElementById('langToggleBtn'),
  langToggleLabel: document.getElementById('langToggleLabel'),
  adsBanner: document.getElementById('adsBanner'),
  reviewsBadge: document.getElementById('reviewsBadge')
};

/* ------------------------- Estado de la aplicación ------------------------- */
const favoritesManager = createFavoritesManager();

// REQUISITO 2: closure de caché — cuando se pide un género ya
// consultado, regresa de inmediato sin volver a llamar a la API.
const filterCache = createFilterCache(genreId => fetchCatalogService({ genreId }));

let currentMovies = [];
let showingFavoritesOnly = false;

/* ===================================================================
   Contador (leader) del spinner de carga
   =================================================================== */
function runCountdown(ms) {
  const steps = 3;
  const stepMs = ms / steps;
  let n = steps;
  els.leaderNumber.textContent = String(n);
  const interval = setInterval(() => {
    n -= 1;
    els.leaderNumber.textContent = n > 0 ? String(n) : '¡Acción!';
    if (n <= 0) clearInterval(interval);
  }, stepMs);
  return interval;
}

/* ===================================================================
   Banners de servicios opcionales (Reseñas / Anuncios)
   REQUISITO 1: si un servicio falla, mostramos su aviso discreto
   pero la galería principal sigue funcionando con normalidad.
   =================================================================== */
function renderServiceBanners({ reviews, reviewsError, ads, adsError }) {
  if (ads) {
    els.adsBanner.hidden = false;
    els.adsBanner.textContent = ads.banner;
    els.adsBanner.classList.remove('service-error');
  } else if (adsError) {
    els.adsBanner.hidden = false;
    els.adsBanner.textContent = t('adsUnavailable');
    els.adsBanner.classList.add('service-error');
    console.warn('[Anuncios]', adsError);
  } else {
    els.adsBanner.hidden = true;
  }

  if (reviews) {
    els.reviewsBadge.hidden = false;
    els.reviewsBadge.textContent = `⭐ ${t('reviewsLabel')}: ${reviews.averageRating}/10 (${reviews.totalReviews})`;
    els.reviewsBadge.classList.remove('service-error');
  } else if (reviewsError) {
    els.reviewsBadge.hidden = false;
    els.reviewsBadge.textContent = t('reviewsUnavailable');
    els.reviewsBadge.classList.add('service-error');
    console.warn('[Reseñas]', reviewsError);
  } else {
    els.reviewsBadge.hidden = true;
  }
}

/* ===================================================================
   Carga principal — dispara los 3 servicios en paralelo con
   Promise.allSettled (usada por: carga inicial, buscar, filtro de año)
   =================================================================== */
async function loadMovies() {
  els.filmLeader.hidden = false;
  els.emptyState.hidden = true;
  els.grid.hidden = true;
  els.statusLine.textContent = isApiConfigured() ? t('statusLoading') : t('statusDemo');

  const countdownHandle = runCountdown(CONFIG.SIMULATED_LATENCY_MS);

  const filters = {
    query: els.searchInput.value.trim(),
    genreId: els.genreSelect.value,
    year: els.yearInput.value.trim()
  };

  try {
    const { movies, reviews, reviewsError, ads, adsError } = await loadHomeData(filters);
    currentMovies = movies;
    applyFiltersAndRender();
    renderServiceBanners({ reviews, reviewsError, ads, adsError });
    els.statusLine.textContent = t('statusResults')(movies.length);
  } catch (err) {
    console.error(err);
    els.statusLine.textContent = t('statusError');
    renderGallery([], favoritesManager, els);
  } finally {
    clearInterval(countdownHandle);
    els.filmLeader.hidden = true;
  }
}

/* ===================================================================
   Filtro por género — usa el CACHÉ (REQUISITO 2), independiente del
   flujo de arriba. La 2da vez que se elige el mismo género, no hay
   spinner ni latencia: se sirve directo desde memoria.
   =================================================================== */
async function handleGenreFilterChange() {
  const genreId = els.genreSelect.value;
  const alreadyCached = filterCache.has(genreId);

  if (!alreadyCached) {
    els.filmLeader.hidden = false;
    els.grid.hidden = true;
    els.statusLine.textContent = t('statusLoading');
    runCountdown(CONFIG.SIMULATED_LATENCY_MS);
  }

  const { movies, fromCache } = await filterCache.getByGenre(genreId);

  currentMovies = movies;
  applyFiltersAndRender();
  els.statusLine.textContent = fromCache
    ? `${t('statusCacheHit')} — ${movies.length} resultado(s).`
    : t('statusResults')(movies.length);

  els.filmLeader.hidden = true;
  els.grid.hidden = false;
}

function applyFiltersAndRender() {
  const list = showingFavoritesOnly
    ? currentMovies.filter(m => favoritesManager.has(m.id))
    : currentMovies;
  renderGallery(list, favoritesManager, els);
}

/* ===================================================================
   Favoritos: panel flotante
   =================================================================== */
function refreshFavoritesPanel() {
  const favs = favoritesManager.getAll();
  els.favCount.textContent = String(favoritesManager.getCount());
  els.favPanelBody.innerHTML = '';

  if (favs.length === 0) {
    const p = document.createElement('p');
    p.className = 'fav-panel__empty';
    p.textContent = t('favPanelEmpty');
    els.favPanelBody.appendChild(p);
    return;
  }

  const frag = document.createDocumentFragment();
  favs.forEach(movie => {
    const item = document.createElement('div');
    item.className = 'fav-item';

    const img = document.createElement('img');
    img.src = getPosterUrl(movie);
    img.alt = '';

    const span = document.createElement('span');
    span.textContent = movie.title;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';
    removeBtn.setAttribute('aria-label', `Quitar ${movie.title} de favoritos`);
    removeBtn.addEventListener('click', () => {
      favoritesManager.toggle(movie);
      refreshFavoritesPanel();
      const cardBtn = els.grid.querySelector(`[data-movie-id="${movie.id}"] .fav-btn`);
      if (cardBtn) cardBtn.classList.remove('active');
      if (showingFavoritesOnly) applyFiltersAndRender();
    });

    item.append(img, span, removeBtn);
    frag.appendChild(item);
  });
  els.favPanelBody.appendChild(frag);
}

/* ===================================================================
   PASO 2 (laboratorio original) — Delegación de eventos: un solo
   listener en el Grid maneja clics de favoritos y apertura de detalle.
   =================================================================== */
els.grid.addEventListener('click', (event) => {
  const card = event.target.closest('.movie-card');
  if (!card) return;

  const movieId = Number(card.dataset.movieId);
  const movie = currentMovies.find(m => m.id === movieId);
  if (!movie) return;

  const favBtn = event.target.closest('[data-action="toggle-fav"]');
  if (favBtn) {
    event.stopPropagation();
    const isFav = favoritesManager.toggle(movie);
    favBtn.classList.toggle('active', isFav);
    refreshFavoritesPanel();
    return;
  }

  openMovieModal(movie, els);
});

/* Reordenamiento por arrastre (parte "movible" del diseño) */
els.grid.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.movie-card');
  if (!card) return;
  card.classList.add('dragging');
  e.dataTransfer.setData('text/plain', card.dataset.movieId);
});
els.grid.addEventListener('dragend', (e) => {
  const card = e.target.closest('.movie-card');
  if (card) card.classList.remove('dragging');
  els.grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
});
els.grid.addEventListener('dragover', (e) => {
  const card = e.target.closest('.movie-card');
  if (!card) return;
  e.preventDefault();
  card.classList.add('drag-over');
});
els.grid.addEventListener('dragleave', (e) => {
  const card = e.target.closest('.movie-card');
  if (card) card.classList.remove('drag-over');
});
els.grid.addEventListener('drop', (e) => {
  const targetCard = e.target.closest('.movie-card');
  if (!targetCard) return;
  e.preventDefault();
  targetCard.classList.remove('drag-over');

  const draggedId = e.dataTransfer.getData('text/plain');
  const draggedCard = els.grid.querySelector(`[data-movie-id="${draggedId}"]`);
  if (!draggedCard || draggedCard === targetCard) return;

  const cards = [...els.grid.children];
  const draggedIndex = cards.indexOf(draggedCard);
  const targetIndex = cards.indexOf(targetCard);
  if (draggedIndex < targetIndex) targetCard.after(draggedCard);
  else targetCard.before(draggedCard);
});

/* Modal */
els.modalClose.addEventListener('click', () => closeModal(els));
els.modalBackdrop.addEventListener('click', (e) => {
  if (e.target === els.modalBackdrop) closeModal(els);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal(els);
});

/* Panel de favoritos flotante y movible */
(function makeFavPanelDraggable() {
  let offsetX = 0, offsetY = 0, dragging = false;

  els.favPanelHandle.addEventListener('mousedown', (e) => {
    dragging = true;
    const rect = els.favPanel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    els.favPanel.style.right = 'auto';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const maxX = window.innerWidth - els.favPanel.offsetWidth;
    const maxY = window.innerHeight - els.favPanel.offsetHeight;
    els.favPanel.style.left = `${Math.min(Math.max(0, e.clientX - offsetX), maxX)}px`;
    els.favPanel.style.top = `${Math.min(Math.max(0, e.clientY - offsetY), maxY)}px`;
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
    document.body.style.userSelect = '';
  });

  els.favPanelHandle.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const rect = els.favPanel.getBoundingClientRect();
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;
    dragging = true;
    els.favPanel.style.right = 'auto';
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const touch = e.touches[0];
    const maxX = window.innerWidth - els.favPanel.offsetWidth;
    const maxY = window.innerHeight - els.favPanel.offsetHeight;
    els.favPanel.style.left = `${Math.min(Math.max(0, touch.clientX - offsetX), maxX)}px`;
    els.favPanel.style.top = `${Math.min(Math.max(0, touch.clientY - offsetY), maxY)}px`;
  }, { passive: true });
  document.addEventListener('touchend', () => { dragging = false; });
})();

/* ===================================================================
   Idioma global
   =================================================================== */
function applyUILanguage() {
  document.documentElement.lang = getLang();
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const text = t(key);
    if (text) el.textContent = text;
  });
  els.langToggleLabel.textContent = t('langToggle');
  populateGenreSelect(els.genreSelect, GENRES);
  refreshFavoritesPanel();
}

els.langToggleBtn.addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
  applyUILanguage();
  filterCache.clear(); // los textos cambian de idioma: invalidamos caché
  loadMovies();
});

/* ===================================================================
   Listeners de filtros
   =================================================================== */
els.searchBtn.addEventListener('click', loadMovies);
els.searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadMovies(); });
els.yearInput.addEventListener('change', loadMovies);
els.genreSelect.addEventListener('change', handleGenreFilterChange);

els.favToggleBtn.addEventListener('click', () => {
  showingFavoritesOnly = !showingFavoritesOnly;
  els.favToggleBtn.setAttribute('aria-pressed', String(showingFavoritesOnly));
  applyFiltersAndRender();
});

/* ------------------------- Arranque ------------------------- */
applyUILanguage();
loadMovies();
