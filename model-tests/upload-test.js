// Uploads one paid test (questions + answer key) to Supabase, so it can be sold.
// The question file of a paid test must NOT be committed: see .gitignore.
// Usage (PowerShell):
//   $env:SUPABASE_URL = 'https://xxxx.supabase.co'
//   $env:SUPABASE_SERVICE_ROLE_KEY = '...'   (Project Settings → API → service_role, keep it secret)
//   node model-tests/upload-test.js N5 test-02
const fs = require('fs');
const path = require('path');
const { buildKey } = require('./make-live-key');

const [level, name] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!level || !name || !url || !secret) {
  console.log('Usage: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then: node model-tests/upload-test.js N5 test-02');
  process.exit(1);
}

const blueprint = JSON.parse(fs.readFileSync(path.join(__dirname, 'shared', 'blueprint.json'), 'utf8'));
const { test, key } = buildKey(level, name);
const minutes = Object.values(blueprint[level].time).reduce((a, b) => a + b, 0);

const row = {
  id: key.test,
  exam: `JLPT-${level}`,
  title_en: test.title.en,
  title_bn: test.title.bn,
  minutes,
  questions: { level: test.level, sections: test.sections },
  key
};

(async () => {
  const res = await fetch(`${url}/rest/v1/tests`, {
    method: 'POST',
    headers: {
      apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(row)
  });
  if (!res.ok) {
    console.error('Upload failed:', res.status, await res.text());
    process.exit(1);
  }
  console.log(`Uploaded ${row.id}: ${Object.keys(key.answers).length} questions, ${minutes} min.`);
  console.log(`Sell it by adding a row to the products table with test = '${row.id}'.`);
})();
