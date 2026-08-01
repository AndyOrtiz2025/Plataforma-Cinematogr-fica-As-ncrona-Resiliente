/* =====================================================================
   main.ts — Punto de entrada de la aplicación.
   Importa todos los módulos y conecta el DOM con la lógica.
   ===================================================================== */

import { CONFIG, GENRES, isApiConfigured, getLang, setLang, t } from './config.js';
import { createFavoritesManager, type FavoritesManager } from './favorites.js';
import { createFilterCache } from './filterCache.js';
import { fetchCatalogService, loadHomeData } from './services.js';
import { renderGallery, populateGenreSelect, getPosterUrl } from './render.js';
import { openMovieModal, closeModal } from './modal.js';
import type { MovieEntity } from './entities/movieEntity.js';
import type { ReviewsEntity } from './entities/reviewsEntity.js';
import type { AdEntity } from './entities/adsEntity.js';

/* -----------------------------------------------------------------
   Helper para obtener elementos del DOM con seguridad de tipos.
   Bajo "strict", getElementById regresa `HTMLElement | null` — este
   helper lanza un error claro en vez de dejar pasar un `null` que
   rompería algo más adelante en tiempo de ejecución.
   ----------------------------------------------------------------- */
function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`No se encontró el elemento #${id} en el DOM`);
  return el as T;
}

/* ------------------------- Referencias al DOM ------------------------- */
const els = {
  grid: getEl<HTMLDivElement>('movieGrid'),
  filmLeader: getEl<HTMLDivElement>('filmLeader'),
  leaderNumber: getEl<HTMLSpanElement>('leaderNumber'),
  emptyState: getEl<HTMLParagraphElement>('emptyState'),
  statusLine: getEl<HTMLParagraphElement>('statusLine'),
  searchInput: getEl<HTMLInputElement>('searchInput'),
  genreSelect: getEl<HTMLSelectElement>('genreSelect'),
  yearInput: getEl<HTMLInputElement>('yearInput'),
  searchBtn: getEl<HTMLButtonElement>('searchBtn'),
  favToggleBtn: getEl<HTMLButtonElement>('favToggleBtn'),
  favPanel: getEl<HTMLElement>('favPanel'),
  favPanelHandle: getEl<HTMLElement>('favPanelHandle'),
  favPanelBody: getEl<HTMLDivElement>('favPanelBody'),
  favCount: getEl<HTMLSpanElement>('favCount'),
  modalBackdrop: getEl<HTMLDivElement>('modalBackdrop'),
  modalContent: getEl<HTMLDivElement>('modalContent'),
  modalClose: getEl<HTMLButtonElement>('modalClose'),
  langToggleBtn: getEl<HTMLButtonElement>('langToggleBtn'),
  langToggleLabel: getEl<HTMLSpanElement>('langToggleLabel'),
  adsBanner: getEl<HTMLParagraphElement>('adsBanner'),
  reviewsBadge: getEl<HTMLParagraphElement>('reviewsBadge')
};

/* ------------------------- Estado de la aplicación ------------------------- */
const favoritesManager: FavoritesManager = createFavoritesManager();

const filterCache = createFilterCache<MovieEntity[]>(genreId => fetchCatalogService({ genreId }));

let currentMovies: MovieEntity[] = [];
let showingFavoritesOnly = false;

/* ===================================================================
   Contador (leader) del spinner de carga
   =================================================================== */
function runCountdown(ms: number): ReturnType<typeof setInterval> {
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
   =================================================================== */
interface ServiceBannerData {
  reviews: ReviewsEntity | null;
  reviewsError: string | null;
  ads: AdEntity | null;
  adsError: string | null;
}

function renderServiceBanners({ reviews, reviewsError, ads, adsError }: ServiceBannerData): void {
  if (ads) {
    els.adsBanner.hidden = false;
    els.adsBanner.textContent = ads.bannerText;
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
   Carga principal — Promise.allSettled (inicial, buscar, año)
   =================================================================== */
async function loadMovies(): Promise<void> {
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
   Filtro por género — usa el caché con closures
   =================================================================== */
async function handleGenreFilterChange(): Promise<void> {
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

function applyFiltersAndRender(): void {
  const list = showingFavoritesOnly
    ? currentMovies.filter(m => favoritesManager.has(m.id))
    : currentMovies;
  renderGallery(list, favoritesManager, els);
}

/* ===================================================================
   Favoritos: panel flotante
   =================================================================== */
function refreshFavoritesPanel(): void {
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
      const cardBtn = els.grid.querySelector<HTMLButtonElement>(`[data-movie-id="${String(movie.id)}"] .fav-btn`);
      if (cardBtn) cardBtn.classList.remove('active');
      if (showingFavoritesOnly) applyFiltersAndRender();
    });

    item.append(img, span, removeBtn);
    frag.appendChild(item);
  });
  els.favPanelBody.appendChild(frag);
}

/* ===================================================================
   Delegación de eventos: un solo listener en el Grid
   =================================================================== */
els.grid.addEventListener('click', (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const card = target.closest<HTMLElement>('.movie-card');
  if (!card || !card.dataset.movieId) return;

  const movieId = card.dataset.movieId;
  const movie = currentMovies.find(m => String(m.id) === movieId);
  if (!movie) return;

  const favBtn = target.closest<HTMLElement>('[data-action="toggle-fav"]');
  if (favBtn) {
    event.stopPropagation();
    const isFav = favoritesManager.toggle(movie);
    favBtn.classList.toggle('active', isFav);
    refreshFavoritesPanel();
    return;
  }

  openMovieModal(movie, els);
});

/* Reordenamiento por arrastre */
els.grid.addEventListener('dragstart', (e: DragEvent) => {
  const target = e.target as HTMLElement;
  const card = target.closest<HTMLElement>('.movie-card');
  if (!card || !e.dataTransfer) return;
  card.classList.add('dragging');
  e.dataTransfer.setData('text/plain', card.dataset.movieId ?? '');
});
els.grid.addEventListener('dragend', (e: DragEvent) => {
  const target = e.target as HTMLElement;
  const card = target.closest<HTMLElement>('.movie-card');
  if (card) card.classList.remove('dragging');
  els.grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
});
els.grid.addEventListener('dragover', (e: DragEvent) => {
  const target = e.target as HTMLElement;
  const card = target.closest<HTMLElement>('.movie-card');
  if (!card) return;
  e.preventDefault();
  card.classList.add('drag-over');
});
els.grid.addEventListener('dragleave', (e: DragEvent) => {
  const target = e.target as HTMLElement;
  const card = target.closest<HTMLElement>('.movie-card');
  if (card) card.classList.remove('drag-over');
});
els.grid.addEventListener('drop', (e: DragEvent) => {
  const target = e.target as HTMLElement;
  const targetCard = target.closest<HTMLElement>('.movie-card');
  if (!targetCard || !e.dataTransfer) return;
  e.preventDefault();
  targetCard.classList.remove('drag-over');

  const draggedId = e.dataTransfer.getData('text/plain');
  const draggedCard = els.grid.querySelector<HTMLElement>(`[data-movie-id="${draggedId}"]`);
  if (!draggedCard || draggedCard === targetCard) return;

  const cards = [...els.grid.children];
  const draggedIndex = cards.indexOf(draggedCard);
  const targetIndex = cards.indexOf(targetCard);
  if (draggedIndex < targetIndex) targetCard.after(draggedCard);
  else targetCard.before(draggedCard);
});

/* Modal */
els.modalClose.addEventListener('click', () => closeModal(els));
els.modalBackdrop.addEventListener('click', (e: MouseEvent) => {
  if (e.target === els.modalBackdrop) closeModal(els);
});
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeModal(els);
});

/* Panel de favoritos flotante y movible */
(function makeFavPanelDraggable(): void {
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;

  els.favPanelHandle.addEventListener('mousedown', (e: MouseEvent) => {
    dragging = true;
    const rect = els.favPanel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    els.favPanel.style.right = 'auto';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', (e: MouseEvent) => {
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

  els.favPanelHandle.addEventListener('touchstart', (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const rect = els.favPanel.getBoundingClientRect();
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;
    dragging = true;
    els.favPanel.style.right = 'auto';
  }, { passive: true });
  document.addEventListener('touchmove', (e: TouchEvent) => {
    if (!dragging) return;
    const touch = e.touches[0];
    if (!touch) return;
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
function applyUILanguage(): void {
  document.documentElement.lang = getLang();
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (!key) return;
    const text = t(key as Parameters<typeof t>[0]);
    if (typeof text === 'string') el.textContent = text;
  });
  els.langToggleLabel.textContent = t('langToggle');
  populateGenreSelect(els.genreSelect, GENRES);
  refreshFavoritesPanel();
}

els.langToggleBtn.addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
  applyUILanguage();
  filterCache.clear();
  void loadMovies();
});

/* ===================================================================
   Listeners de filtros
   =================================================================== */
els.searchBtn.addEventListener('click', () => void loadMovies());
els.searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter') void loadMovies();
});
els.yearInput.addEventListener('change', () => void loadMovies());
els.genreSelect.addEventListener('change', () => void handleGenreFilterChange());

els.favToggleBtn.addEventListener('click', () => {
  showingFavoritesOnly = !showingFavoritesOnly;
  els.favToggleBtn.setAttribute('aria-pressed', String(showingFavoritesOnly));
  applyFiltersAndRender();
});

/* ------------------------- Arranque ------------------------- */
applyUILanguage();
void loadMovies();
