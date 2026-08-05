/* =====================================================================
   modal.ts
   La "alerta interactiva": detalle extendido de la película
   seleccionada.
   ===================================================================== */

import { getLang, t } from './config.js';
import { genreNames, getPosterUrl } from './render.js';
import type { CatalogEntity } from './entities/catalog-entity.js';

export interface ModalElements {
  modalBackdrop: HTMLElement;
  modalContent: HTMLElement;
}

export function renderModalBody(item: CatalogEntity, modalContent: HTMLElement): void {
  modalContent.innerHTML = '';

  const img = document.createElement('img');
  img.src = getPosterUrl(item);
  img.alt = `${getLang() === 'en' ? 'Poster of' : 'Póster de'} ${item.title}`;

  const h2 = document.createElement('h2');
  h2.id = 'modalTitle';
  h2.textContent = item.title;

  const meta = document.createElement('p');
  meta.className = 'modal-meta';
  const ratingText = item.rating ? ` · ${t('modalRating')} ${item.rating}/10` : '';
  meta.textContent = `${item.year} · ${genreNames(item)}${ratingText}`;

  const overview = document.createElement('p');
  overview.className = 'overview';
  overview.textContent = item.overview || (getLang() === 'en' ? 'Loading synopsis…' : 'Cargando sinopsis…');

  modalContent.append(img, h2, meta, overview);
}

export function openMovieModal(item: CatalogEntity, els: ModalElements): void {
  renderModalBody(item, els.modalContent);
  els.modalBackdrop.hidden = false;
}

export function closeModal(els: ModalElements): void {
  els.modalBackdrop.hidden = true;
}
