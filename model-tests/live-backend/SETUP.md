# Live Exam Setup (free, Google Sheets + Apps Script)

Ekbar setup korle protita notun exam-er jonno shudhu 2 ta step lagbe.

## Ekbar-er setup

1. **Google Sheet banao.** [sheets.new](https://sheets.new) khule naam dao, jemon `Samurai Syntax Results`.
2. **AnswerKeys tab banao.** Niche `+` chepe notun sheet khulo, naam dao **`AnswerKeys`** (banan hubohu eta-i hote hobe).
   Prothom row-te heading likho: `A1: test`, `B1: key`, `C1: closes`.
3. **Script lagao.** Menu theke **Extensions → Apps Script** e jao. Ja lekha ache shob muche dao,
   [Code.gs](Code.gs) file-er pura code paste koro, tarpor 💾 Save chapo.
4. **Web app deploy koro.**
   **Deploy → New deployment →** ⚙️ chepe **Web app** select koro.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy** chapo. Google permission chaile Allow dao. "Unsafe" dekhale **Advanced → Go to … (unsafe)**
     chapo. Eta tomar nijer script, tai bhoy nei.
   - Je **Web app URL** dibe (`https://script.google.com/macros/s/.../exec`), sheta copy koro.
5. **URL website-e boshao.** [live-config.js](../../live-config.js)-e `submitUrl: ''`-er moddhe URL-ta paste koro.

## Protita notun exam-er jonno

1. **Answer key Sheet-e dao.** Terminal-e run koro:
   ```
   node model-tests/make-live-key.js N5 test-01
   ```
   `model-tests/live-keys/N5-test-01.json` file toiri hobe. AnswerKeys sheet-e notun row-te:
   - A column: `N5/test-01`
   - B column: oi file-er pura lekha paste koro
   - C column (optional): exam bondho howar shomoy, jemon `2026-11-07T22:30:00+06:00`.
     Er 5 minute por theke ar kono answer neya hobe na.
2. **Schedule dao.** [live-config.js](../../live-config.js)-er `exams` list-e exam jog koro (id, title, test, start, minutes).

## Result kothay dekhbe

Sheet-er **Results** tab (prothom submission-er shomoy nijei toiri hoy). Protita student-er jonno ek row:
naam, roll, score, PASS/FAIL, section-wise score, koto bar tab bodleche, ar shob answer.

## ⚠️ Joruri

- **`answer-keys/` ar `live-keys/` folder kokhono public website ba public GitHub repo-te upload korbe na.**
  Website-e shudhu `model-tests/questions/`, `model-tests/shared/` ar `model-tests/images/` lagbe.
- Question file website-e thakle exam-er age-o keu chaile seta khule dekhte pare. Beshi strict hote chaile
  question file-ta exam shuru howar thik age upload koro.
- Code.gs bodlale **Deploy → Manage deployments → ✏️ → Version: New version** diye abar deploy korte hobe.
  URL ekoi thakbe.
- Free Google account-e ek shathe onek submission ashle kichu late hote pare. Shei khetre website nijei abar
  try kore, ar answer student-er device-e save thake.
