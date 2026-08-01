/* =====================================================================
   render.ts
   Funciones puras que crean nodos con document.createElement e
   insertan todo con un DocumentFragment (un solo reflow).
   ===================================================================== */

import { CONFIG, getLang, genreMapForLang, t, type Genre } from './config.js';
import type { MovieEntity } from './entities/movieEntity.js';
import type { FavoritesManager } from './favorites.js';

export interface GalleryElements {
  grid: HTMLElement;
  emptyState: HTMLElement;
}

export function genreNames(movie: MovieEntity): string {
  const ids = movie.genreIds ?? [];
  const map = genreMapForLang(getLang());
  const names = ids.map(id => map.get(id)).filter((n): n is string => Boolean(n));
  return names.length > 0 ? names.join(', ') : t('unclassified');
}

export function getPosterUrl(movie: MovieEntity): string {
  if (movie.posterPath && movie.posterPath.startsWith('http')) return movie.posterPath;
  if (movie.posterPath) return `${CONFIG.IMG_BASE}${movie.posterPath}`;
  return `https://picsum.photos/seed/${movie.posterSeed ?? movie.id}/342/513`;
}

export function createMovieCard(movie: MovieEntity, favoritesManager: FavoritesManager): HTMLElement {
  const card = document.createElement('article');
  card.className = 'movie-card';
  card.dataset.movieId = String(movie.id);
  card.draggable = true;

  const posterWrap = document.createElement('div');
  posterWrap.className = 'poster-wrap';

  const img = document.createElement('img');
  img.src = getPosterUrl(movie);
  img.alt = `${getLang() === 'en' ? 'Poster of' : 'Póster de'} ${movie.title}`;
  img.loading = 'lazy';
  posterWrap.appendChild(img);

  const favBtn = document.createElement('button');
  favBtn.type = 'button';
  favBtn.className = 'fav-btn' + (favoritesManager.has(movie.id) ? ' active' : '');
  favBtn.dataset.action = 'toggle-fav';
  favBtn.setAttribute('aria-label', 'Marcar como favorita');
  favBtn.textContent = '★';
  posterWrap.appendChild(favBtn);

  const info = document.createElement('div');
  info.className = 'card-info';

  const title = document.createElement('h3');
  title.textContent = movie.title;

  const meta = document.createElement('p');
  meta.className = 'card-meta';
  const ratingText = movie.rating ? ` · ${movie.rating}★` : '';
  meta.textContent = `${movie.year} · ${genreNames(movie)}${ratingText}`;

  info.append(title, meta);
  card.append(posterWrap, info);
  return card;
}

export function renderGallery(movies: MovieEntity[], favoritesManager: FavoritesManager, els: GalleryElements): void {
  const frag = document.createDocumentFragment();
  movies.forEach(movie => frag.appendChild(createMovieCard(movie, favoritesManager)));

  els.grid.innerHTML = '';
  els.grid.appendChild(frag);

  els.emptyState.hidden = movies.length !== 0;
  els.grid.hidden = movies.length === 0;
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
