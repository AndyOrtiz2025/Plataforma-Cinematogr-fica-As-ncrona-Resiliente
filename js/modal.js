/* =====================================================================
   modal.js
   La "alerta interactiva" del Paso 2 original: detalle extendido de
   la película seleccionada, con delegación de eventos manejada desde
   main.js (aquí solo vive el render del contenido).
   ===================================================================== */

import { getLang, t } from './config.js';
import { genreNames, getPosterUrl } from './render.js';

export function renderModalBody(movie, modalContent) {
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

export function openMovieModal(movie, els) {
  renderModalBody(movie, els.modalContent);
  els.modalBackdrop.hidden = false;
}

export function closeModal(els) {
  els.modalBackdrop.hidden = true;
}
