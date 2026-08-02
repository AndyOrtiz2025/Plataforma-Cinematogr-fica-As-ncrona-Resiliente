/* =====================================================================
   services/ads.service.ts
   Servicio SIMULADO de Anuncios (opcional — puede fallar sin romper
   el catálogo principal).
   ===================================================================== */

import { CONFIG } from '../config.js';
import { CINEGRID_DEBUG } from './debug.service.js';
import type { AdsDTO } from '../dtos/ads.dto.js';
import type { AdEntity } from '../entities/ads.entity.js';
import { mapAdsToEntity } from '../mappers/ads.mapper.js';

export function getAds(): Promise<AdEntity> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (CINEGRID_DEBUG.forceAdsError || Math.random() < CONFIG.SERVICE_FAILURE_RATE) {
        reject(new Error('Servicio de Anuncios no disponible (timeout simulado)'));
        return;
      }
      const dto: AdsDTO = { banner: '🍿 Estreno especial esta semana — 2x1 en boletos' };
      resolve(mapAdsToEntity(dto));
    }, 400 + Math.random() * 500);
  });
}
