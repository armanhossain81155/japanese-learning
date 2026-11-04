# Samurai Syntax — JLPT Mock Tests

A Japanese learning website with JLPT **N5, N4 and N3** mock tests that follow the official exam format.

## Features

- **Exam format like the real JLPT**: 文字・語彙 (Vocabulary) → 文法・読解 (Grammar · Reading) → 聴解 (Listening), with the official question types (漢字読み, 表記, 文脈規定, 言い換え, 用法, ★ sentence composition, reading passages, notices, 課題理解, ポイント理解, 発話表現, 即時応答)
- **Timed exam**: a countdown timer that submits the test automatically when time runs out
- **Question palette**: jump to any question, flag questions to come back to, and see your progress
- **Listening audio**: dialogues are read aloud with the browser's Japanese voice (Web Speech API), with different pitches for male and female speakers
- **Scaled scoring**: scores on the official 0–180 scale, with sectional minimums and the real pass marks (N5: 80, N4: 90, N3: 95)
- **Answer review**: an explanation for every question, filters for incorrect, unanswered and flagged questions, and listening scripts
- **Section practice**: practise vocabulary, grammar or listening on its own
- **Kana chart and quiz**: tap any hiragana or katakana to hear it
- **Progress history** saved in localStorage
- **Live exams**: scheduled exams that open and close at a set time, one attempt per student, option shuffling, tab-switch tracking, and resume after a reload. Answers are graded by a free Google Apps Script backend, so answer keys never reach the browser. Setup: [model-tests/live-backend/SETUP.md](model-tests/live-backend/SETUP.md)
- **Full-length model tests** in [model-tests/](model-tests/), with answer keys kept separately
- **Bangla / English toggle**: switches the whole site, including instructions and explanations. The choice is remembered, and switching during an exam keeps your answers and the timer
- Dark mode, responsive layout and keyboard shortcuts (`1`–`4`, `←` `→`, `F`)

## Run

Open `index.html` in a browser. No build step is needed.

> For listening audio, use a browser that has a Japanese voice (Chrome and Edge include one by default).

## Adding questions

All content is in `data.js`. Add a question to a group like this:

```js
{ q: '<u>山</u>に のぼります。', opts: ['やま', 'かわ', 'うみ', 'そら'], a: 0,
  exp: T('English explanation…', 'বাংলা ব্যাখ্যা…') }
```

UI text (buttons, headings, messages) lives in `i18n.js`. Add each new key to both `en` and `bn`.

For listening questions, add an `audio` script. Lines that start with `男：` or `女：` are voiced as different speakers.
