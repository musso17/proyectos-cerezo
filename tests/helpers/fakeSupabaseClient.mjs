// Cliente de Supabase simulado para probar el store sin red.
export const calls = [];
export const rows = new Map();

const query = (table) => {
  const state = { table, op: null, payload: null, filters: [] };
  const builder = {
    select() { return builder; },
    insert(payload) { state.op = 'insert'; state.payload = payload; return builder; },
    update(payload) { state.op = 'update'; state.payload = payload; return builder; },
    delete() { state.op = 'delete'; return builder; },
    eq(column, value) { state.filters.push([column, value]); return builder; },
    then(resolve) {
      calls.push(state);
      if (state.op === 'update') {
        const id = state.filters.find(([c]) => c === 'id')?.[1];
        const merged = { ...(rows.get(id) || {}), ...state.payload };
        rows.set(id, merged);
        return resolve({ data: [merged], error: null });
      }
      if (state.op === 'insert') {
        state.payload.forEach((row) => rows.set(row.id, row));
        return resolve({ data: state.payload, error: null });
      }
      if (state.op === 'delete') {
        const id = state.filters.find(([c]) => c === 'id')?.[1];
        rows.delete(id);
        return resolve({ data: null, error: null });
      }
      return resolve({ data: Array.from(rows.values()), error: null });
    },
  };
  return builder;
};

export const supabase = {
  from: (table) => query(table),
  channel: () => ({ on() { return this; }, subscribe() { return this; } }),
};
export const hasSupabaseConfig = true;
