// Spreads correct answers evenly over the option positions so students can't guess by position.
// Questions with 4 options and with 3 options (listening もんだい3/4) are balanced separately.
// Swaps each correct option (and its picture, if any) into a target slot and updates the answer key.
// Usage: node model-tests/balance.js N5 test-01
const fs = require('fs');
const path = require('path');

const [level, name] = process.argv.slice(2);
if (!level || !name) {
  console.log('Usage: node model-tests/balance.js <level> <test-name>   e.g. N5 test-01');
  process.exit(1);
}

const qPath = path.join(__dirname, 'questions', level, `${name}.json`);
const kPath = path.join(__dirname, 'answer-keys', level, `${name}.json`);
const test = JSON.parse(fs.readFileSync(qPath, 'utf8'));
const keyFile = JSON.parse(fs.readFileSync(kPath, 'utf8'));
const key = keyFile.answers;

// Seeded shuffle so the result is repeatable for the same test
let seed = [...level + name].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) >>> 0;
const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const all = test.sections.flatMap(s => s.parts.flatMap(p => p.questions));
const report = [];
for (const n of [...new Set(all.map(q => q.opts.length))].sort()) {
  const group = all.filter(q => q.opts.length === n);
  const targets = shuffle(group.map((_, i) => i % n));
  group.forEach((q, i) => {
    const k = key[q.id];
    const to = targets[i];
    if (k.a === to) return;
    [q.opts[k.a], q.opts[to]] = [q.opts[to], q.opts[k.a]];
    if (q.optImages) [q.optImages[k.a], q.optImages[to]] = [q.optImages[to], q.optImages[k.a]];
    k.a = to;
  });
  const dist = new Array(n).fill(0);
  group.forEach(q => dist[key[q.id].a]++);
  report.push(`${n} options: ${dist.join(' / ')}`);
}

fs.writeFileSync(qPath, JSON.stringify(test, null, 2) + '\n');
fs.writeFileSync(kPath, JSON.stringify(keyFile, null, 2) + '\n');
console.log(`${level}/${name}: answer positions — ${report.join(' | ')}`);
