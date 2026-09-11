'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data/maps', name), 'utf8'));
function assert(ok, message) { if (!ok) throw new Error(message); }
const ext = read('briarwell-dwarven-cave-registry.json');
assert(ext.areas.length === 20, `Expected 20 Dwarven Cave extension areas, got ${ext.areas.length}.`);
for (let i=1;i<=16;i++) {
  const id=`briarwell-dwarven-c${String(i).padStart(2,'0')}`;
  const map=read(`${id}.json`);
  assert(map.id===id, `${id} id mismatch.`);
  assert(map.referenceSize.width===768 && map.referenceSize.height===576, `${id} art geometry mismatch.`);
}
const c06=read('briarwell-dwarven-c06.json');
assert(c06.interactables.some((x)=>x.id==='concealed-dwarven-mechanism'), 'C6 secret mechanism missing.');
const secret=read('briarwell-dwarven-secret.json');
assert(secret.interactables.some((x)=>x.id==='treasury-chest'), 'Secret treasury chest missing.');
assert(secret.interactables.some((x)=>x.lootItem==='plate-mail'), 'Plate mail missing.');
assert(secret.interactables.some((x)=>x.lootItem==='two-handed-sword'), 'Two-handed sword missing.');
assert(secret.interactables.some((x)=>x.lootItem==='mace'), 'Mace missing.');
const hall=read('briarwell-dwarven-great-hall.json');
assert(hall.referenceSize.width===1800, 'Great Hall is not scrollable/panoramic.');
assert(hall.encounter.members.find((x)=>x.kind==='goblin').count===5, 'Great Hall goblin count mismatch.');
assert(hall.encounter.members.find((x)=>x.kind==='hobgoblin').count===2, 'Great Hall hobgoblin count mismatch.');
assert(hall.encounter.members.find((x)=>x.kind==='hobgoblin-chieftain').count===1, 'Great Hall chieftain missing.');
const runtime=fs.readFileSync(path.join(root,'js/dwarven-cave-runtime.js'),'utf8');
assert(runtime.includes('Math.floor(rating / 2)'), 'Secret Search/2 rule is not exact.');
const cliff=read('briarwell-dwarven-cliffside.json');
assert(cliff.portals.some((x)=>x.id==='to-vista'), 'Cliff edge vista transition missing.');
const vista=read('briarwell-dwarven-vista.json');
assert(vista.art.background.includes('briarwell-dwarven-vista-v1.svg'), 'Mirrored Briarwell vista art missing.');
console.log('Dwarven Cave system contract passes: C1-C16, secret treasury, Great Hall encounter, Search/2 mechanism and cliffside vista.');
