// Builds the compact grading key that goes into the "AnswerKeys" sheet of the live exam backend.
// Each entry is [correct option index, scoring category].
// Usage: node model-tests/make-live-key.js N5 test-01
const fs = require('fs');
const path = require('path');

// Same categories as the real score report:
// N5/N4: language knowledge + reading together, listening separate.
// N3: vocabulary/grammar, reading and listening each separate.
const READING = new Set(['short-passage', 'mid-passage', 'long-passage', 'info-retrieval']);

// Also used by upload-test.js
function buildKey(level, name) {
  const test = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions', level, `${name}.json`), 'utf8'));
  const key = JSON.parse(fs.readFileSync(path.join(__dirname, 'answer-keys', level, `${name}.json`), 'utf8')).answers;
  const category = (sectionId, type) => {
    if (sectionId === 'listening') return 'listening';
    if (level === 'N3' && READING.has(type)) return 'reading';
    return 'knowledge';
  };

  const answers = {};
  for (const section of test.sections) {
    for (const part of section.parts) {
      for (const q of part.questions) {
        if (!key[q.id]) throw new Error(`${q.id} is missing from the answer key`);
        answers[q.id] = [key[q.id].a, category(section.id, part.type)];
      }
    }
  }
  return { test, key: { level, test: `${level}/${name}`, answers } };
}

module.exports = { buildKey };

if (require.main === module) {
  const [level, name] = process.argv.slice(2);
  if (!level || !name) {
    console.log('Usage: node model-tests/make-live-key.js <level> <test-name>   e.g. N5 test-01');
    process.exit(1);
  }
  const out = buildKey(level, name).key;
  const outDir = path.join(__dirname, 'live-keys');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${level}-${name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(out));
  console.log(`Wrote ${path.relative(process.cwd(), outFile)} (${Object.keys(out.answers).length} answers).`);
  console.log('Paste its contents into column B of the AnswerKeys sheet, with', out.test, 'in column A.');
}
