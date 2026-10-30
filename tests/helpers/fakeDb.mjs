// Base de datos simulada en memoria con la parte de la API de Supabase que usan las herramientas MCP.
// Sirve para pruebas y para el servidor de desarrollo local (tests/mcp_dev_server.mjs): NO toca Supabase.

class Query {
  constructor(db, table) { Object.assign(this, { db, table, filters: [], op: 'select', payload: null, one: false, lim: null }); }
  select() { return this; }
  eq(col, val) { this.filters.push((r) => r[col] === val); return this; }
  ilike(col, pat) {
    const re = new RegExp(`^${pat.replace(/\\([\\%_])/g, '\u0000$1').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.').replace(/\u0000(.)/g, '\\$1')}$`, 'i');
    this.filters.push((r) => re.test(r[col] ?? '')); return this;
  }
  limit(x) { this.lim = x; return this; }
  single() { this.one = true; return this; }
  insert(rows) { this.op = 'insert'; this.payload = rows; return this; }
  update(patch) { this.op = 'update'; this.payload = patch; return this; }
  then(res, rej) { return Promise.resolve(this.run()).then(res, rej); }
  run() {
    const rows = this.db.tables[this.table];
    if (!rows) return { data: null, error: { message: `relation "${this.table}" does not exist` } };
    if (this.op === 'insert') {
      const nuevos = this.payload.map((r) => ({ ...r }));
      rows.push(...nuevos); this.db.writes.push(['insert', this.table]);
      return { data: this.one ? nuevos[0] : nuevos, error: null };
    }
    let sel = rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === 'update') { sel.forEach((r) => Object.assign(r, this.payload)); this.db.writes.push(['update', this.table]); return { data: null, error: null }; }
    if (this.lim != null) sel = sel.slice(0, this.lim);
    if (this.one) return sel.length ? { data: sel[0], error: null } : { data: null, error: { message: 'no rows' } };
    return { data: sel, error: null };
  }
}
export class FakeDb {
  constructor(tables = {}) { this.tables = { projects: [], retainers: [], ...tables }; this.writes = []; }
  from(name) { return new Query(this, name); }
}
