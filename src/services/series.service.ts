/* =====================================================================
   services/series.service.ts
   Servicio de catálogo de Series — API real de TMDB + mapper.
   ===================================================================== */

import { getPopularSeries } from './tmdb.service.js';
import { mapSeriesToEntity } from '../mappers/series.mapper.js';
import type { SeriesEntity } from '../entities/series.entity.js';

export async function getSeriesCatalog(): Promise<SeriesEntity[]> {
  const dtos = await getPopularSeries();
  return dtos.map(mapSeriesToEntity);
}
