/* =====================================================================
   core/data-catalog-manager.ts

   REQUISITO 1 — Repositorio Genérico de Contenidos.

   Clase reutilizable que gestiona colecciones en memoria de CUALQUIER
   tipo de entidad, siempre que tenga un campo `id`. La misma clase
   sirve para MovieEntity, SeriesEntity o DocumentaryEntity, sin
   duplicar código — el tipo `<T>` se ajusta según lo que se le pida,
   y TypeScript preserva la firma exacta en cada retorno (getById
   regresa T | undefined, filter regresa T[], etc.).
   ===================================================================== */

export class DataCatalogManager<T extends { id: string | number }> {
  private items = new Map<T['id'], T>();

  /** Agrega o reemplaza un elemento (indexado por su id). */
  add(item: T): void {
    this.items.set(item.id, item);
  }

  /** Agrega varios elementos de una sola vez. */
  addMany(items: T[]): void {
    items.forEach(item => this.add(item));
  }

  /** Búsqueda directa por id — regresa exactamente el tipo T. */
  getById(id: T['id']): T | undefined {
    return this.items.get(id);
  }

  /** Regresa una copia de todos los elementos, tipada como T[]. */
  getAll(): T[] {
    return [...this.items.values()];
  }

  /** Búsqueda polimórfica: cualquier condición sobre T, sin perder el tipo. */
  filter(predicate: (item: T) => boolean): T[] {
    return this.getAll().filter(predicate);
  }

  /**
   * Actualización parcial seguro (usa Partial<T> del requisito 2):
   * fusiona los cambios sobre el elemento existente, sin necesidad
   * de reescribir el objeto completo.
   */
  update(id: T['id'], changes: Partial<T>): T | undefined {
    const existing = this.items.get(id);
    if (!existing) return undefined;
    const updated: T = { ...existing, ...changes };
    this.items.set(id, updated);
    return updated;
  }

  remove(id: T['id']): boolean {
    return this.items.delete(id);
  }

  count(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }
}
