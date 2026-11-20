// Guardado de cotizaciones en Supabase (tabla public.cotizaciones).
// La RLS deja leer y escribir solo al equipo (public.is_team_member()); quién
// editó y cuándo lo completa el trigger de la base, no el navegador.

const TABLE = 'cotizaciones';
const COLUMNS = 'id, number, client, title, summary, doc, updated_at, updated_by_name';

const forbidden = (error) => {
  const e = new Error('Sin permiso para las cotizaciones');
  e.code = 'forbidden';
  e.cause = error;
  return e;
};
const isForbidden = (error) => error && (error.code === '42501' || /permission|row-level security/i.test(error.message || ''));
// La tabla aún no existe (falta aplicar supabase/migrations/20261120120000_cotizaciones.sql).
const isMissingTable = (error) => error && (error.code === '42P01' || error.code === 'PGRST205' || /could not find the table|does not exist/i.test(error.message || ''));
const fail = (error) => {
  if (isForbidden(error)) return forbidden(error);
  if (isMissingTable(error)) {
    const e = new Error('Falta crear la tabla de cotizaciones en Supabase');
    e.code = 'missing_table';
    e.cause = error;
    return e;
  }
  return error;
};

const toQuote = (row) => ({
  id: row.id,
  number: row.number,
  client: row.client,
  title: row.title,
  summary: row.summary,
  doc: row.doc || {},
  updatedAt: row.updated_at ? Date.parse(row.updated_at) : 0,
  updatedByName: row.updated_by_name || '',
});

export function createSupabaseStore(supabase) {
  return {
    async list() {
      const { data, error } = await supabase
        .from(TABLE)
        .select(COLUMNS)
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) throw fail(error);
      return (data || []).map(toQuote);
    },

    async save(id, body) {
      const row = { number: body.number, client: body.client, title: body.title, summary: body.summary, doc: body.doc };
      if (id) {
        const { data, error } = await supabase.from(TABLE).update(row).eq('id', id).select('id, updated_at');
        if (error) throw fail(error);
        if (data && data.length) return { id: data[0].id, updatedAt: Date.parse(data[0].updated_at) };
        // Otra persona la eliminó mientras estaba abierta: se vuelve a crear.
      }
      const { data, error } = await supabase.from(TABLE).insert(row).select('id, updated_at').single();
      if (error) throw fail(error);
      return { id: data.id, updatedAt: Date.parse(data.updated_at) };
    },

    async remove(id) {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw fail(error);
    },

    // Cambios de otros integrantes: refresca la lista en vivo.
    subscribe(onChange) {
      let timer = null;
      const channel = supabase
        .channel('cotizaciones')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => {
          clearTimeout(timer);
          timer = setTimeout(onChange, 400);
        })
        .subscribe();
      return () => {
        clearTimeout(timer);
        supabase.removeChannel(channel);
      };
    },
  };
}
