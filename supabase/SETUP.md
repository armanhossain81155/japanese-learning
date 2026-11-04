# Accounts and payments: setup

This turns on login, buying mock tests (bKash, Nagad, Rocket, bank transfer), access codes by email,
the 2-device limit for courses and the one-device-per-exam rule. Everything here is on free plans.

How a sale works:

1. The student signs up, opens **Buy Tests**, picks a test or a course and a payment method.
2. They send the money by Send Money (or bank transfer) and enter the number they paid from and the TrxID.
3. You open **My Account → Payments** (admin), check the TrxID in your bKash/Nagad/Rocket app or bank statement, and press **Approve**.
4. The student gets an email with a code like `SS-7KQ2-M9XD`. They enter it in **My Account**, and the test or course opens.
   The code only works on the account that bought it.

## 1. Create the Supabase project

1. Sign up at <https://supabase.com> (free) and create a project. Choose the region **Singapore** (closest to Bangladesh).
2. **SQL Editor → New query**: paste all of [schema.sql](schema.sql) and press **Run**.
3. **Authentication → URL Configuration**: set **Site URL** to `https://armanhossain81155.github.io/japanese-learning/`.
4. **Project Settings → API**: copy the **Project URL** and the **anon public** key into
   [../backend-config.js](../backend-config.js) (`supabaseUrl`, `supabaseAnonKey`).
   The anon key is safe to publish. Never publish the **service_role** key.

## 2. Payment numbers

In [../backend-config.js](../backend-config.js), fill in your bKash / Nagad / Rocket numbers and bank details.
A method with an empty number is hidden. Also set `support` (for example `WhatsApp 01XXXXXXXXX`).

## 3. Email for access codes (Brevo, free, 300 emails a day)

1. Sign up at <https://www.brevo.com>.
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: add your Gmail address and confirm it.
3. **SMTP & API → API Keys → Generate a new API key**. Copy it.

If the email fails, the admin page shows the code so you can send it yourself by WhatsApp/SMS.

## 4. Deploy the server function

Install Node.js, then in PowerShell, in the `japanese-learning` folder:

```powershell
npx supabase login
npx supabase link --project-ref <your project ref>      # the xxxx in https://xxxx.supabase.co
npx supabase secrets set BREVO_API_KEY=<key> SENDER_EMAIL=<your gmail> SITE_URL=https://armanhossain81155.github.io/japanese-learning/
npx supabase functions deploy api
```

## 5. Make yourself admin

Sign up on the website with your own email. Then in Supabase **SQL Editor**:

```sql
update public.profiles set is_admin = true where email = 'your@email.com';
```

Log out and in again. **My Account** now has a **Payments** button.

## 6. Upload paid tests and set prices

The question files of paid tests are not in git (see `.gitignore`), so nobody can read them on GitHub.
Upload each one to the database:

```powershell
$env:SUPABASE_URL = 'https://xxxx.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = '<service_role key>'
node model-tests/upload-test.js N5 test-02
node model-tests/upload-test.js N5 test-03
```

Then sell it: **Table Editor → products → Insert row**.

| Column | Single test | Course |
|---|---|---|
| id | `jlpt-n5-test-04` | `jlpt-n5-course-3m` |
| kind | `test` | `course` |
| exam | `JLPT-N5` | `JLPT-N5` |
| test | `N5/test-04` | (empty) |
| price | taka, e.g. `500` | e.g. `999` |
| days | (empty) | e.g. `90` |
| attempts | how many tries, e.g. `1` | (ignored) |

A course opens every `test` product with the same `exam`. schema.sql already adds three example products.
To stop selling something, set `active` to false.

## Rules the server enforces

- **One device per exam:** while a test is open on one device, starting any exam on another device fails.
  If the first device goes quiet for 90 seconds (closed, crashed), the exam can be continued on the other device.
  An exam opened on a new device closes on the old one.
- **Course = 2 devices:** a user with an active course can use only 2 browsers. To move to a new phone, use
  **Reset devices** on the admin page.
- **Time limit:** the timer runs on the server. When time is up, only answers saved before the end count.
- **Same TrxID twice** is refused.
- Students never receive answer keys; the server grades the test.

## Later: automatic bKash / Nagad payments

When you have merchant accounts, a payment webhook can create and approve the order itself, then call the
same code-sending step used by `adminReview` in [functions/api/index.ts](functions/api/index.ts).
The rest of the system stays the same.
