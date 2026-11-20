// Plantilla de una cotización nueva y normalización de las guardadas.

export const CUR = {
  PEN: { head: 'S/', sym: 'S/' },
  USD: { head: 'USD', sym: '$' },
  EUR: { head: 'EUR', sym: '€' },
};

const uid = () => Math.random().toString(36).slice(2, 9);
const pad2 = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const plusDays = (isoStr, n) => {
  const [y, m, d] = isoStr.split('-').map(Number);
  return iso(new Date(y, m - 1, d + n));
};

export function blankQuote(number) {
  const today = iso(new Date());
  return {
    v: 1,
    id: null,
    number: number || `CS-${new Date().getFullYear()}-01`,
    issueDate: today,
    validUntil: plusDays(today, 15),
    currency: 'PEN',
    igv: 18,
    brandSub: 'Lima, Perú · cerezoperu.com',
    eyebrow: 'Propuesta de servicios audiovisuales',
    title: 'Cobertura audiovisual\nde evento',
    meta: [
      { id: uid(), label: 'Cliente', value: '' },
      { id: uid(), label: 'Contacto', value: '' },
      { id: uid(), label: 'Evento', value: 'por definir' },
      { id: uid(), label: 'Lugar', value: 'por confirmar' },
    ],
    scopeTitle: 'Alcance del servicio',
    scope: [
      { id: uid(), tag: 'Cobertura', text: 'Registro audiovisual de 1 evento de hasta 4 h' },
      { id: uid(), tag: 'Entrega', text: '1 video resumen editado de 60 a 90 s' },
      { id: uid(), tag: 'Entrega', text: '20 fotografías editadas en alta resolución' },
      { id: uid(), tag: 'Ajustes', text: '1 ronda de ajustes por entrega' },
    ],
    showExcludes: true,
    excludesLabel: 'No incluye:',
    excludes: 'pauta publicitaria; traslados fuera de Lima; material impreso.',
    ecoTitle: 'Desglose económico',
    colConcept: 'Concepto',
    colDetail: 'Detalle',
    rows: [
      { id: uid(), type: 'item', concept: 'Cobertura de evento — Producción', detail: 'Equipo de 2 personas · hasta 4 h de registro', amount: '1200' },
      { id: uid(), type: 'item', concept: 'Edición y postproducción', detail: 'Video resumen · 20 fotografías editadas', amount: '800' },
      { id: uid(), type: 'total', label: 'Total', sum: null, manual: null, detail: 'igv', detailText: '' },
    ],
    showTableNote: true,
    tableNoteLabel: 'Montos sin IGV.',
    tableNote: '',
    termsTitle: 'Condiciones y tiempos de entrega',
    terms: [
      { id: uid(), label: 'Forma de pago', body: '50 % al confirmar el proyecto\n50 % contra entrega de materiales', note: 'Transferencia bancaria. Factura electrónica con IGV si la requiere.' },
      { id: uid(), label: 'Entregas', body: 'Edición entregada a los 10 días hábiles del rodaje', note: '' },
      { id: uid(), label: 'Derechos de uso', body: 'Uso irrestricto para el cliente', note: 'Cerezo se reserva el derecho de uso en portfolio.' },
    ],
    footerContact: 'Lima, Perú · cerezoperu.com\nhola@cerezoperu.com',
    validityLabel: 'Propuesta válida hasta',
  };
}

export function normalize(s) {
  const base = blankQuote(s && s.number);
  const out = Object.assign({}, base, s || {});
  ['meta', 'scope', 'rows', 'terms'].forEach((k) => {
    if (!Array.isArray(out[k])) out[k] = [];
    out[k].forEach((x) => { if (!x.id) x.id = uid(); });
  });
  if (!CUR[out.currency]) out.currency = 'PEN';
  return out;
}
