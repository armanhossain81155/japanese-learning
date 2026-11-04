# Model Tests

Full-length JLPT model tests (N5, N4, N3), written to follow the official format and question counts.
They are original questions, not copies of official exam papers.

```
model-tests/
├── questions/<level>/test-XX.json     questions only, no answers   → safe to publish
├── images/                            listening pictures (SVG)   → publish together with questions
├── answer-keys/<level>/test-XX.json   correct answers + bilingual explanations   → PRIVATE
├── live-keys/<level>-test-XX.json     compact grading key for Google Sheets   → PRIVATE
├── shared/blueprint.json              question count per part for each level
├── shared/types.json                  question type names and instructions (en/bn)
├── live-backend/                      Google Apps Script grader + setup guide
├── pics/make-pics.js                  draws the pictures in code and attaches them to questions
├── review.html                        review page for checking tests (local only, reads answer keys)
├── serve.js                           local web server for the site and the review page
├── validate.js                        checks every test against blueprint and answer key
├── balance.js                         spreads correct answers evenly over positions 1–4
└── make-live-key.js                   builds the live-keys file for one test
```

## Status

| Level | Done | Target | Questions per test |
|---|---|---|---|
| N5 | 3 | 20 | 67 |
| N4 | 0 | 20 | 85 |
| N3 | 0 | 20 | 102 |

## Workflow for each new test

```
node model-tests/pics/make-pics.js          # draw + attach listening pictures (add the test to ATTACH first)
node model-tests/balance.js N5 test-02      # even out answer positions
node model-tests/validate.js                # must report 0 errors
node model-tests/make-live-key.js N5 test-02
```

## Listening format (same as the real exam)

- もんだい1/2: 4 options; many use pictures (`optImages`).
- もんだい3 発話表現: a scene picture (`image`) with an arrow at the speaker, and **3 options that are only heard**.
- もんだい4 即時応答: **3 options that are only heard** (`spokenOpts: true`). The live exam reads them after the dialogue.

Before publishing, a Japanese teacher or advanced learner should read through each test once.
