/* =====================================================================
   services/debug.service.ts
   Panel de depuración para el screencast: desde la consola del
   navegador se puede forzar que un servicio falle en vivo, ej:
     CINEGRID_DEBUG.forceAdsError = true
   ===================================================================== */

export interface DebugFlags {
  forceReviewsError: boolean;
  forceAdsError: boolean;
}

declare global {
  interface Window {
    CINEGRID_DEBUG: DebugFlags;
  }
}

export const CINEGRID_DEBUG: DebugFlags = {
  forceReviewsError: false,
  forceAdsError: false
};

window.CINEGRID_DEBUG = CINEGRID_DEBUG;
