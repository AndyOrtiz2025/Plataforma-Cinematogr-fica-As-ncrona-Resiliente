/* =====================================================================
   main.ts — Punto de entrada de la aplicación.
   Conecta el DOM con la lógica: catálogo, favoritos, idioma, y ahora
   también el DataCatalogManager<T> genérico para Movies/Series/Docs.
   ===================================================================== */

import { CONFIG, GENRES, getLang, setLang, t } from './config.js';
import { createFavoritesManager, type FavoritesManager } from './favorites.js';
import { createFilterCache } from './filter-cache.js';
import { getCatalog, type CatalogFilters } from './services/catalog.service.js';
import { loadHomeData } from './services/orchestrator.service.js';
import { getSeriesCatalog } from './services/series.service.js';
import { getDocumentaryCatalog } from './services/documentary.service.js';
import { renderGallery, populateGenreSelect, getPosterUrl } from './render.js';
import { openMovieModal, closeModal } from './modal.js';
import { DataCatalogManager } from './core/data-catalog-manager.js';
import type { MovieEntity } from './entities/movie.entity.js';
import type { SeriesEntity } from './entities/series.entity.js';
import type { DocumentaryEntity } from './entities/documentary.entity.js';
import type { CatalogEntity } from './entities/catalog-entity.js';
import type { ReviewsEntity } from './entities/reviews.entity.js';
import type { AdEntity } from './entities/ads.entity.js';
import './services/debug.service.js'; // deja CINEGRID_DEBUG disponible en window

/* -----------------------------------------------------------------
   Helper para obtener elementos del DOM con seguridad de tipos.
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
  contentTypeSelect: getEl<HTMLSelectElement>('contentTypeSelect'),
  searchField: getEl<HTMLDivElement>('searchField'),
  genreField: getEl<HTMLDivElement>('genreField'),
  yearField: getEl<HTMLDivElement>('yearField'),
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

// REQUISITO: closure de caché — cuando se pide un género ya
// consultado, regresa de inmediato sin volver a llamar a la API real.
const filterCache = createFilterCache<MovieEntity[]>(genreId => getCatalog({ genreId }));

/* ---------------------------------------------------------------------
   REQUISITO 1 (Tarea 4) — Un DataCatalogManager<T> genérico por cada
   tipo de contenido. La MISMA clase, sin duplicar código, gestiona
   3 colecciones totalmente distintas y tipadas.
   --------------------------------------------------------------------- */
const movieCatalog = new DataCatalogManager<MovieEntity>();
const seriesCatalog = new DataCatalogManager<SeriesEntity>();
const documentaryCatalog = new DataCatalogManager<DocumentaryEntity>();

type ContentType = 'movie' | 'series' | 'documentary';
let activeContentType: ContentType = 'movie';
let showingFavoritesOnly = false;
let seriesAndDocsLoaded = false;

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
   Carga de Películas — Promise.allSettled contra los 3 servicios
   (Catálogo real de TMDB + Reseñas/Anuncios simulados)
   =================================================================== */
async function loadMovies(): Promise<void> {
  els.filmLeader.hidden = false;
  els.emptyState.hidden = true;
  els.grid.hidden = true;
  els.statusLine.textContent = t('statusLoading');

  const countdownHandle = runCountdown(CONFIG.SIMULATED_LATENCY_MS);

  const filters: CatalogFilters = {
    query: els.searchInput.value.trim(),
    genreId: els.genreSelect.value,
    year: els.yearInput.value.trim()
  };

  try {
    const { movies, reviews, reviewsError, ads, adsError } = await loadHomeData(filters);
    movieCatalog.clear();
    movieCatalog.addMany(movies);
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
   Filtro por género (solo aplica a Películas) — usa el caché
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

  movieCatalog.clear();
  movieCatalog.addMany(movies);
  applyFiltersAndRender();
  els.statusLine.textContent = fromCache
    ? `${t('statusCacheHit')} — ${movies.length} resultado(s).`
    : t('statusResults')(movies.length);

  els.filmLeader.hidden = true;
  els.grid.hidden = false;
}

/* ===================================================================
   Carga de Series y Documentales — solo una vez, bajo demanda, con
   sus propias instancias de DataCatalogManager<T>.
   =================================================================== */
async function ensureSeriesAndDocsLoaded(): Promise<void> {
  if (seriesAndDocsLoaded) return;

  els.filmLeader.hidden = false;
  els.grid.hidden = true;
  els.statusLine.textContent = t('statusLoading');
  const countdownHandle = runCountdown(CONFIG.SIMULATED_LATENCY_MS);

  try {
    const [series, docs] = await Promise.all([getSeriesCatalog(), getDocumentaryCatalog()]);
    seriesCatalog.addMany(series);
    documentaryCatalog.addMany(docs);
    seriesAndDocsLoaded = true;
  } catch (err) {
    console.error(err);
    els.statusLine.textContent = t('statusError');
  } finally {
    clearInterval(countdownHandle);
    els.filmLeader.hidden = true;
  }
}

/* ===================================================================
   Cambiar el tipo de contenido activo (Movies / Series / Documentaries)
   Reutiliza el MISMO renderGallery para los 3 — esa es la prueba de
   que DataCatalogManager<T> y el render son de verdad genéricos.
   =================================================================== */
function getActiveCatalogItems(): CatalogEntity[] {
  switch (activeContentType) {
    case 'movie': return movieCatalog.getAll();
    case 'series': return seriesCatalog.getAll();
    case 'documentary': return documentaryCatalog.getAll();
  }
}

async function handleContentTypeChange(): Promise<void> {
  activeContentType = els.contentTypeSelect.value as ContentType;

  const isMovies = activeContentType === 'movie';
  els.searchField.hidden = !isMovies;
  els.genreField.hidden = !isMovies;
  els.yearField.hidden = !isMovies;

  if (isMovies) {
    applyFiltersAndRender();
    els.statusLine.textContent = t('statusResults')(movieCatalog.count());
    return;
  }

  await ensureSeriesAndDocsLoaded();
  applyFiltersAndRender();
  const count = activeContentType === 'series' ? seriesCatalog.count() : documentaryCatalog.count();
  els.statusLine.textContent = t('statusResults')(count);
}

function applyFiltersAndRender(): void {
  const items = getActiveCatalogItems();
  const list = showingFavoritesOnly
    ? items.filter(item => favoritesManager.has(item.id))
    : items;
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
      const fullItem = getActiveCatalogItems().find(m => m.id === movie.id);
      if (fullItem) favoritesManager.toggle(fullItem);
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

  const movieId = Number(card.dataset.movieId);
  const item = getActiveCatalogItems().find(m => m.id === movieId);
  if (!item) return;

  const favBtn = target.closest<HTMLElement>('[data-action="toggle-fav"]');
  if (favBtn) {
    event.stopPropagation();
    const isFav = favoritesManager.toggle(item);
    favBtn.classList.toggle('active', isFav);
    refreshFavoritesPanel();
    return;
  }

  openMovieModal(item, els);
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
  filterCache.clear(); // los textos cambian de idioma: invalidamos caché
  void loadMovies();
});

/* ===================================================================
   Listeners de filtros
   =================================================================== */
els.contentTypeSelect.addEventListener('change', () => void handleContentTypeChange());
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
