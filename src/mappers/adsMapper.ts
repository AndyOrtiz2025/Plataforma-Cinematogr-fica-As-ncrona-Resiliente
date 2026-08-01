/* =====================================================================
   mappers/adsMapper.ts
   Traduce el DTO crudo de Anuncios (`banner`) a la Entity limpia
   (`bannerText`).
   ===================================================================== */

import type { AdsServiceDTO } from '../dtos/adsDTO.js';
import type { AdEntity } from '../entities/adsEntity.js';

export function mapAdsToEntity(dto: AdsServiceDTO): AdEntity {
  return { bannerText: dto.banner };
}
