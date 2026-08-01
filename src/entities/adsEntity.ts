/* =====================================================================
   entities/adsEntity.ts
   Forma LIMPIA del anuncio — renombramos `banner` a `bannerText` para
   que el nombre sea más descriptivo dentro de la app (esto también
   demuestra que el mapper realmente "traduce", no solo copia).
   ===================================================================== */

export interface AdEntity {
  bannerText: string;
}
