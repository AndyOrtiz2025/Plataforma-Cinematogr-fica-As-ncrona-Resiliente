/* =====================================================================
   modal.ts
   La "alerta interactiva": detalle extendido de la película
   seleccionada.
   ===================================================================== */

import { getLang, t } from './config.js';
import { genreNames, getPosterUrl } from './render.js';
import type { MovieEntity } from './entities/movie.entity.js';

export interface ModalElements {
  modalBackdrop: HTMLElement;
  modalContent: HTMLElement;
}

export function renderModalBody(movie: MovieEntity, modalContent: HTMLElement): void {
  modalContent.innerHTML = '';

  const img = document.createElement('img');
  img.src = getPosterUrl(movie);
  img.alt = `${getLang() === 'en' ? 'Poster of' : 'Póster de'} ${movie.title}`;

  const h2 = document.createElement('h2');
  h2.id = 'modalTitle';
  h2.textContent = movie.title;

  const meta = document.createElement('p');
  meta.className = 'modal-meta';
  const ratingText = movie.rating ? ` · ${t('modalRating')} ${movie.rating}/10` : '';
  meta.textContent = `${movie.year} · ${genreNames(movie)}${ratingText}`;

  const overview = document.createElement('p');
  overview.className = 'overview';
  overview.textContent = movie.overview || (getLang() === 'en' ? 'Loading synopsis…' : 'Cargando sinopsis…');

  modalContent.append(img, h2, meta, overview);
}

export function openMovieModal(movie: MovieEntity, els: ModalElements): void {
  renderModalBody(movie, els.modalContent);
  els.modalBackdrop.hidden = false;
}

export function closeModal(els: ModalElements): void {
  els.modalBackdrop.hidden = true;
}
