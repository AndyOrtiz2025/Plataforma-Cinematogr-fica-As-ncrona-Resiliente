/* =====================================================================
   mappers/ads.mapper.ts
   Traduce el DTO crudo de Anuncios a la Entity limpia.
   ===================================================================== */

import type { AdsDTO } from '../dtos/ads.dto.js';
import type { AdEntity } from '../entities/ads.entity.js';

export function mapAdsToEntity(dto: AdsDTO): AdEntity {
  return { bannerText: dto.banner };
}
