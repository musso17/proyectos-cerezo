import assert from 'assert';

console.log('Running retainer count tests...');

const isCarbono = (p) => {
  const tag = (p.tag || p.etiqueta || p.properties?.tag || '').toString().trim().toLowerCase();
  const client = (p.client || p.cliente || p.properties?.client || '').toString().trim().toLowerCase();
  return tag === 'carbono' || client === 'carbono';
};

const classifyProjects = (projects) => {
  return projects.map(p => ({ ...p, type: isCarbono(p) ? 'retainer' : 'variable' }));
};

const countMonthlyRetainerProjects = (projects, monthKey = '2025-02') => {
  const mm = (projects || []).filter(p => (p.dateKey || p.fecha || '').toString().startsWith(monthKey) || (p.fecha || '').toString().startsWith(monthKey));
  const retainerProjects = mm.filter(p => isCarbono(p) || (p.type === 'retainer'));
  return retainerProjects.length;
};

// test data
const projects = [
  { id: '1', nombre: 'A', client: 'Carbono', fecha: '2025-02' },
  { id: '2', nombre: 'B', properties: { tag: 'carbono' }, fecha: '2025-02' },
  { id: '3', nombre: 'C', client: 'Otro', fecha: '2025-02' },
  { id: '4', nombre: 'D', client: 'Carbono', fecha: '2025-01' },
  { id: '5', nombre: 'E', client: 'Otro', fecha: '2025-02' },
  { id: '6', nombre: 'F', properties: { tag: 'carbono' }, fecha: '2025-02' }
];

const classified = classifyProjects(projects);
assert.strictEqual(classified.filter(p => p.type === 'retainer').length, 4, 'There should be 4 retainer projects total');

const count = countMonthlyRetainerProjects(projects, '2025-02');
assert.strictEqual(count, 3, 'There should be 3 retainer projects in 2025-02');

console.log('retainer count tests passed.');
