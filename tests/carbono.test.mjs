import assert from 'assert';

console.log('Running carbono classification tests...');

const isCarbono = (val) => val && val.toString().trim().toLowerCase() === 'carbono';

const classifyProject = (p) => {
  const tag = (p.tag || p.properties?.tag || '').toString().trim().toLowerCase();
  const client = (p.client || p.properties?.client || '').toString().trim().toLowerCase();
  if (isCarbono(tag) || client === 'carbono') return 'retainer';
  return 'variable';
};

// happy path
const projects = [
  { id: 'a', name: 'P1', client: 'Carbono' },
  { id: 'b', name: 'P2', properties: { tag: 'carbono' } },
  { id: 'c', name: 'P3', client: 'otro' },
  { id: 'd', name: 'P4' },
];

assert.strictEqual(classifyProject(projects[0]), 'retainer');
assert.strictEqual(classifyProject(projects[1]), 'retainer');
assert.strictEqual(classifyProject(projects[2]), 'variable');
assert.strictEqual(classifyProject(projects[3]), 'variable');

console.log('carbono tests passed.');
