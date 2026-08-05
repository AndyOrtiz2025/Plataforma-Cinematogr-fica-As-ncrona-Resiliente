/* =====================================================================
   services/documentary.service.ts
   Servicio de catálogo de Documentales — API real de TMDB + mapper.
   ===================================================================== */

import { getDocumentaryMovies } from './tmdb.service.js';
import { mapDocumentaryToEntity } from '../mappers/documentary.mapper.js';
import type { DocumentaryEntity } from '../entities/documentary.entity.js';

export async function getDocumentaryCatalog(): Promise<DocumentaryEntity[]> {
  const dtos = await getDocumentaryMovies();
  return dtos.map(mapDocumentaryToEntity);
}
