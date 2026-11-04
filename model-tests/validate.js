// Checks every model test against the blueprint and its answer key.
// Usage: node model-tests/validate.js
const fs = require('fs');
const path = require('path');

const root = __dirname;
const blueprint = JSON.parse(fs.readFileSync(path.join(root, 'shared/blueprint.json'), 'utf8'));
const types = JSON.parse(fs.readFileSync(path.join(root, 'shared/types.json'), 'utf8'));

// Listening もんだい3/4 (verbal expressions, quick response) have 3 spoken options in the real exam
const SPOKEN_TYPES = new Set(['verbal', 'quick']);

let errors = 0;
let tests = 0;
let questions = 0;
let pictures = 0;
const err = (file, msg) => { errors++; console.log(`  ✗ ${file}: ${msg}`); };
const imageExists = (p) => fs.existsSync(path.join(root, p));

for (const level of ['N5', 'N4', 'N3']) {
  const qDir = path.join(root, 'questions', level);
  if (!fs.existsSync(qDir)) continue;

  for (const name of fs.readdirSync(qDir).filter(f => f.endsWith('.json')).sort()) {
    const file = `${level}/${name}`;
    const before = errors;
    const test = JSON.parse(fs.readFileSync(path.join(qDir, name), 'utf8'));
    const keyPath = path.join(root, 'answer-keys', level, name);
    if (!fs.existsSync(keyPath)) { err(file, 'answer key missing'); continue; }
    const key = JSON.parse(fs.readFileSync(keyPath, 'utf8')).answers;
    const bp = blueprint[level].sections;
    const seen = new Set();
    let pics = 0;
    tests++;

    for (const section of test.sections) {
      const counts = {};
      for (const part of section.parts) {
        if (!types[part.type]) err(file, `unknown type "${part.type}"`);
        counts[part.type] = (counts[part.type] || 0) + part.questions.length;
        const spoken = SPOKEN_TYPES.has(part.type);

        for (const q of part.questions) {
          questions++;
          if (seen.has(q.id)) err(file, `duplicate id ${q.id}`);
          seen.add(q.id);
          if ('a' in q || 'exp' in q) err(file, `${q.id} has an answer in the question file`);
          const want = spoken ? 3 : 4;
          if (!Array.isArray(q.opts) || q.opts.length !== want) err(file, `${q.id} needs ${want} options`);
          if (new Set(q.opts).size !== q.opts.length) err(file, `${q.id} has duplicate options`);
          if (spoken && !q.spokenOpts) err(file, `${q.id} options should be spoken (spokenOpts: true)`);
          if (section.id === 'listening' && !q.audio) err(file, `${q.id} listening question has no audio script`);
          if (q.image) { pics++; if (!imageExists(q.image)) err(file, `${q.id} image not found: ${q.image}`); }
          if (q.optImages) {
            pics += q.optImages.length;
            if (q.optImages.length !== q.opts.length) err(file, `${q.id} optImages must match options`);
            q.optImages.forEach(p => { if (!imageExists(p)) err(file, `${q.id} image not found: ${p}`); });
          }

          const k = key[q.id];
          if (!k) { err(file, `${q.id} missing from answer key`); continue; }
          if (!(k.a >= 0 && k.a < q.opts.length)) err(file, `${q.id} answer index out of range`);
          if (!k.exp || !k.exp.en || !k.exp.bn) err(file, `${q.id} explanation needs en and bn`);
        }
      }
      for (const [type, n] of Object.entries(bp[section.id] || {})) {
        if ((counts[type] || 0) !== n) err(file, `${section.id}/${type}: ${counts[type] || 0} questions, blueprint says ${n}`);
      }
    }
    for (const id of Object.keys(key)) if (!seen.has(id)) err(file, `answer key has unknown id ${id}`);
    pictures += pics;

    const all = test.sections.flatMap(s => s.parts.flatMap(p => p.questions));
    const dist = (n) => {
      const d = new Array(n).fill(0);
      all.filter(q => q.opts.length === n).forEach(q => key[q.id] && d[key[q.id].a]++);
      return d.join('/');
    };
    console.log(`  ${errors > before ? '✗' : '✓'} ${file}: ${seen.size} questions, ${pics} pictures, answer positions ${dist(4)} (4 opts) · ${dist(3)} (3 opts)`);
  }
}

console.log(`\n${tests} test(s), ${questions} question(s), ${pictures} picture(s), ${errors} error(s)`);
process.exit(errors ? 1 : 0);
