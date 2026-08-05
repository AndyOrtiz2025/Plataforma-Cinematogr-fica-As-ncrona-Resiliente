/* =====================================================================
   render.ts
   Funciones puras que crean nodos con document.createElement e
   insertan todo con un DocumentFragment (un solo reflow).

   Trabaja con CatalogEntity (Movie | Series | Documentary) — la misma
   función sirve para los 3 tipos de contenido, sin duplicar código,
   gracias a que comparten la misma "forma" de campos.
   ===================================================================== */

import { CONFIG, getLang, genreMapForLang, t, type Genre } from './config.js';
import type { CatalogEntity } from './entities/catalog-entity.js';
import type { FavoritesManager } from './favorites.js';

export interface GalleryElements {
  grid: HTMLElement;
  emptyState: HTMLElement;
}

export function genreNames(item: Pick<CatalogEntity, 'genreIds'>): string {
  const ids = item.genreIds ?? [];
  const map = genreMapForLang(getLang());
  const names = ids.map(id => map.get(id)).filter((n): n is string => Boolean(n));
  return names.length > 0 ? names.join(', ') : t('unclassified');
}

/** Acepta cualquier objeto que tenga id + posterPath — funciona igual
    con una CatalogEntity completa o con los campos Pick de favoritos. */
export function getPosterUrl(item: { id: number; posterPath: string | null }): string {
  if (item.posterPath) return `${CONFIG.IMG_BASE}${item.posterPath}`;
  // TMDB a veces no tiene póster — usamos un placeholder determinista.
  return `https://picsum.photos/seed/${item.id}/342/513`;
}

export function createMovieCard(item: CatalogEntity, favoritesManager: FavoritesManager): HTMLElement {
  const card = document.createElement('article');
  card.className = 'movie-card';
  card.dataset.movieId = String(item.id);
  card.draggable = true;

  const posterWrap = document.createElement('div');
  posterWrap.className = 'poster-wrap';

  const img = document.createElement('img');
  img.src = getPosterUrl(item);
  img.alt = `${getLang() === 'en' ? 'Poster of' : 'Póster de'} ${item.title}`;
  img.loading = 'lazy';
  posterWrap.appendChild(img);

  const favBtn = document.createElement('button');
  favBtn.type = 'button';
  favBtn.className = 'fav-btn' + (favoritesManager.has(item.id) ? ' active' : '');
  favBtn.dataset.action = 'toggle-fav';
  favBtn.setAttribute('aria-label', 'Marcar como favorita');
  favBtn.textContent = '★';
  posterWrap.appendChild(favBtn);

  const info = document.createElement('div');
  info.className = 'card-info';

  const title = document.createElement('h3');
  title.textContent = item.title;

  const meta = document.createElement('p');
  meta.className = 'card-meta';
  const ratingText = item.rating ? ` · ${item.rating}★` : '';
  meta.textContent = `${item.year} · ${genreNames(item)}${ratingText}`;

  info.append(title, meta);
  card.append(posterWrap, info);
  return card;
}

export function renderGallery(items: CatalogEntity[], favoritesManager: FavoritesManager, els: GalleryElements): void {
  const frag = document.createDocumentFragment();
  items.forEach(item => frag.appendChild(createMovieCard(item, favoritesManager)));

  els.grid.innerHTML = '';
  els.grid.appendChild(frag);

  els.emptyState.hidden = items.length !== 0;
  els.grid.hidden = items.length === 0;
}

export function populateGenreSelect(genreSelect: HTMLSelectElement, genres: Genre[]): void {
  const previousValue = genreSelect.value;
  genreSelect.innerHTML = '';

  const allOpt = document.createElement('option');
  allOpt.value = '';
  allOpt.textContent = t('optAll');
  genreSelect.appendChild(allOpt);

  const frag = document.createDocumentFragment();
  genres.forEach(g => {
    const opt = document.createElement('option');
    opt.value = String(g.id);
    opt.textContent = g[getLang()];
    frag.appendChild(opt);
  });
  genreSelect.appendChild(frag);
  genreSelect.value = previousValue;
}
