/**
 * Samurai Syntax — live exam backend (Google Apps Script, free).
 *
 * Sheets in this spreadsheet:
 *   AnswerKeys  A: test (e.g. N5/test-01)   B: key JSON from make-live-key.js   C: closes at (optional, e.g. 2026-11-07T22:30:00+06:00)
 *   Results     created automatically; one row per submitted answer sheet
 *
 * Deploy as a web app: Execute as "Me", Who has access "Anyone". See SETUP.md.
 */

const SCORING = {
  N5: { pass: 80, cats: { knowledge: { max: 120, min: 38 }, listening: { max: 60, min: 19 } } },
  N4: { pass: 90, cats: { knowledge: { max: 120, min: 38 }, listening: { max: 60, min: 19 } } },
  N3: { pass: 95, cats: { knowledge: { max: 60, min: 19 }, reading: { max: 60, min: 19 }, listening: { max: 60, min: 19 } } }
};

// Late submissions within this many minutes after closing are still accepted (slow networks)
const GRACE_MINUTES = 5;

const HEADERS = [
  'Received', 'Exam ID', 'Name', 'Roll / Email', 'Test', 'Score', 'Max', 'Result',
  'Correct', 'Questions', 'Section scores', 'Tab switches', 'Time up', 'Started', 'Submitted', 'Answers'
];

function doGet() {
  return json_({ ok: true, service: 'Samurai Syntax live exams' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    const data = JSON.parse(e.postData.contents);
    const keyRow = findKey_(String(data.test || ''));
    if (!keyRow) return json_({ ok: false, error: 'unknown-test' });

    if (keyRow.closes && Date.now() > keyRow.closes + GRACE_MINUTES * 60000) {
      return json_({ ok: false, error: 'closed' });
    }

    const examId = String(data.examId || '').slice(0, 100);
    const name = String(data.name || '').trim().slice(0, 60);
    const roll = String(data.roll || '').trim().slice(0, 80);
    if (!examId || !name || !roll) return json_({ ok: false, error: 'missing-fields' });

    const sheet = getResultsSheet_();
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === examId && String(rows[i][3]).trim().toLowerCase() === roll.toLowerCase()) {
        return json_({ ok: false, error: 'duplicate' });
      }
    }

    const score = grade_(keyRow.key, data.answers || {});
    sheet.appendRow([
      new Date(), examId, name, roll, keyRow.key.test, score.total, score.max, score.passed ? 'PASS' : 'FAIL',
      score.correct, score.count, JSON.stringify(score.cats), Number(data.tabSwitches) || 0,
      data.timeUp ? 'yes' : '', String(data.startedAt || ''), String(data.submittedAt || ''), JSON.stringify(data.answers || {})
    ]);
    return json_(Object.assign({ ok: true }, score));
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function grade_(key, answers) {
  const cfg = SCORING[key.level];
  const stats = {};
  Object.keys(cfg.cats).forEach(c => { stats[c] = { correct: 0, total: 0 }; });
  let correct = 0;
  let count = 0;

  Object.keys(key.answers).forEach(id => {
    const a = key.answers[id][0];
    const cat = key.answers[id][1];
    stats[cat].total++;
    count++;
    if (answers[id] === a) { stats[cat].correct++; correct++; }
  });

  const cats = {};
  let total = 0, max = 0, allMin = true;
  Object.keys(cfg.cats).forEach(c => {
    const def = cfg.cats[c];
    const s = stats[c];
    const sc = s.total ? Math.round(s.correct / s.total * def.max) : 0;
    cats[c] = sc;
    total += sc;
    max += def.max;
    if (sc < def.min) allMin = false;
  });

  return { total, max, passed: total >= cfg.pass && allMin, correct, count, cats };
}

function findKey_(test) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('AnswerKeys');
  if (!sheet) return null;
  const rows = sheet.getDataRange().getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === test && rows[i][1]) {
      const closes = rows[i][2] ? new Date(rows[i][2]).getTime() : null;
      return { key: JSON.parse(rows[i][1]), closes: isNaN(closes) ? null : closes };
    }
  }
  return null;
}

function getResultsSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('Results');
  if (!sheet) {
    sheet = ss.insertSheet('Results');
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
