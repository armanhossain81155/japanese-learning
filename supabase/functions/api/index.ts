// Samurai Syntax API (Supabase Edge Function).
// Every call is POST { action, ...data } with the user's login token.
// Questions and answer keys of paid tests only leave the database through here,
// and only to a user who has bought them, on one device at a time.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false }
});

const MAX_COURSE_DEVICES = 2;
// A session that has not sent a heartbeat for this long counts as closed (browser crashed, phone died)
const STALE_MS = 90_000;
// Answers that arrive this long after the timer ended are still accepted (slow networks)
const GRACE_MS = 2 * 60_000;

const SCORING: Record<string, { pass: number; cats: Record<string, { max: number; min: number }> }> = {
  N5: { pass: 80, cats: { knowledge: { max: 120, min: 38 }, listening: { max: 60, min: 19 } } },
  N4: { pass: 90, cats: { knowledge: { max: 120, min: 38 }, listening: { max: 60, min: 19 } } },
  N3: { pass: 95, cats: { knowledge: { max: 60, min: 19 }, reading: { max: 60, min: 19 }, listening: { max: 60, min: 19 } } }
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

class Fail extends Error {}
const fail = (code: string): never => { throw new Fail(code); };
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const str = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);
// Returns the query rows, or throws the database error
const must = ({ data, error }: { data: any; error: unknown }): any => { if (error) throw error; return data; };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return reply('ok');
  try {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) fail('login');
    const body = await req.json();
    const handler = ACTIONS[body.action];
    if (!handler) fail('unknown-action');
    return reply({ ok: true, ...(await handler(user!, body)) });
  } catch (err) {
    if (err instanceof Fail) return reply({ ok: false, error: err.message });
    console.error(err);
    return reply({ ok: false, error: 'server' }, 500);
  }
});

type User = { id: string; email?: string };
type Body = Record<string, any>;

const ACTIONS: Record<string, (user: User, body: Body) => Promise<Record<string, unknown>>> = {
  // ===== Account =====
  async device(user, { deviceId, label }) {
    const id = str(deviceId, 64);
    if (!id) fail('bad-device');
    const known = must(await db.from('devices').select('device_id').eq('user_id', user.id));
    const isKnown = known.some((d: any) => d.device_id === id);
    if (!isKnown && known.length >= MAX_COURSE_DEVICES && await hasCourse(user.id)) fail('device-limit');
    must(await db.from('devices').upsert({ user_id: user.id, device_id: id, label: str(label, 120), last_seen: new Date().toISOString() }));
    return {};
  },

  async me(user) {
    const [profile, ents, orders, devices, results] = await Promise.all([
      db.from('profiles').select('name, phone, is_admin').eq('id', user.id).single(),
      db.from('entitlements').select('product_id, kind, exam, test, attempts_left, expires_at').eq('user_id', user.id),
      db.from('orders').select('id, product_id, amount, method, trx_id, status, note, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      db.from('devices').select('device_id, label, last_seen').eq('user_id', user.id).order('last_seen', { ascending: false }),
      db.from('exam_sessions').select('id, test, started_at, submitted_at, score').eq('user_id', user.id).not('submitted_at', 'is', null).order('submitted_at', { ascending: false }).limit(50)
    ]);
    const now = Date.now();
    return {
      email: user.email,
      profile: must(profile),
      entitlements: must(ents).filter((e: any) => (!e.expires_at || Date.parse(e.expires_at) > now) && (e.attempts_left == null || e.attempts_left > 0)),
      orders: must(orders), devices: must(devices), results: must(results)
    };
  },

  // ===== Buying =====
  async order(user, { productId, method, sender, trxId }) {
    const product = must(await db.from('products').select('id, price, active').eq('id', str(productId)).maybeSingle());
    if (!product || !product.active) fail('bad-product');
    if (!['bkash', 'nagad', 'rocket', 'bank'].includes(method)) fail('bad-method');
    const s = str(sender, 60), trx = str(trxId, 60).toUpperCase();
    if (!s || trx.length < 6) fail('bad-fields');
    const { error } = await db.from('orders').insert({ user_id: user.id, product_id: product.id, amount: product.price, method, sender: s, trx_id: trx });
    if (error?.code === '23505') fail('trx-used');
    if (error) throw error;
    return {};
  },

  async redeem(user, { code, deviceId }) {
    const c = must(await db.from('access_codes').select('code, product_id, redeemed_at, user_id').eq('code', str(code, 40).toUpperCase()).maybeSingle());
    // A code only works for the account that bought it
    if (!c || c.user_id !== user.id) fail('bad-code');
    if (c.redeemed_at) fail('code-used');
    const p = must(await db.from('products').select('*').eq('id', c.product_id).single());

    let expires: string | null = null;
    if (p.kind === 'course') {
      // Buying the same course again extends it
      const current = must(await db.from('entitlements').select('expires_at').eq('user_id', user.id).eq('kind', 'course').eq('exam', p.exam).order('expires_at', { ascending: false }).limit(1));
      const from = Math.max(Date.now(), current[0] ? Date.parse(current[0].expires_at) : 0);
      expires = new Date(from + p.days * 86_400_000).toISOString();
      // A course allows 2 devices: keep this one and forget older ones
      if (deviceId) must(await db.from('devices').delete().eq('user_id', user.id).neq('device_id', str(deviceId, 64)));
    }
    must(await db.from('entitlements').insert({
      user_id: user.id, product_id: p.id, kind: p.kind, exam: p.exam, test: p.test,
      attempts_left: p.kind === 'test' ? p.attempts : null, expires_at: expires
    }));
    must(await db.from('access_codes').update({ redeemed_at: new Date().toISOString() }).eq('code', c.code));
    return { product: p.id, kind: p.kind, test: p.test, exam: p.exam, expires };
  },

  // ===== Exams =====
  async start(user, { test, deviceId }) {
    const dev = str(deviceId, 64);
    const t = must(await db.from('tests').select('id, exam, title_en, title_bn, minutes, questions, key').eq('id', str(test)).maybeSingle());
    if (!t) fail('bad-test');
    await requireDevice(user.id, dev);
    await closeExpired(user.id);

    // Only one device may be inside any exam at a time
    const open = must(await db.from('exam_sessions').select('*').eq('user_id', user.id).is('submitted_at', null));
    const busy = open.find((s: any) => s.device_id !== dev && Date.now() - Date.parse(s.last_seen) < STALE_MS);
    if (busy) fail('in-use');

    let session = open.find((s: any) => s.test === t.id);
    if (session) {
      // Resume, possibly on this device after the other one went quiet
      session = must(await db.from('exam_sessions').update({ device_id: dev, last_seen: new Date().toISOString() }).eq('id', session.id).select().single());
    } else {
      await useAttempt(user.id, t);
      const now = Date.now();
      session = must(await db.from('exam_sessions').insert({
        user_id: user.id, test: t.id, device_id: dev,
        started_at: new Date(now).toISOString(), ends_at: new Date(now + t.minutes * 60_000).toISOString()
      }).select().single());
    }
    return {
      session: { id: session.id, startedAt: session.started_at, endsAt: session.ends_at, answers: session.answers || {}, tabSwitches: session.tab_switches, shots: session.shots },
      test: { id: t.id, title: { en: t.title_en, bn: t.title_bn }, minutes: t.minutes, ...t.questions }
    };
  },

  async beat(user, body) {
    const s = await ownSession(user.id, body);
    must(await db.from('exam_sessions').update({
      last_seen: new Date().toISOString(), answers: cleanAnswers(body.answers),
      tab_switches: Number(body.tabSwitches) || 0, shots: Number(body.shots) || 0
    }).eq('id', s.id));
    return { endsAt: s.ends_at };
  },

  async submit(user, body) {
    const s = await ownSession(user.id, body);
    const late = Date.now() > Date.parse(s.ends_at) + GRACE_MS;
    // After the grace period only the answers saved by heartbeats count
    const answers = late ? (s.answers || {}) : cleanAnswers(body.answers);
    const t = must(await db.from('tests').select('key').eq('id', s.test).single());
    const score = grade(t.key, answers);
    must(await db.from('exam_sessions').update({
      submitted_at: new Date().toISOString(), answers, score,
      tab_switches: Number(body.tabSwitches) || 0, shots: Number(body.shots) || 0
    }).eq('id', s.id));
    return { score };
  },

  // ===== Admin =====
  async adminOrders(user, { status }) {
    await requireAdmin(user.id);
    const orders = must(await db.from('orders').select('*, products(title_en, kind)').eq('status', str(status) || 'pending').order('created_at', { ascending: false }).limit(200));
    const ids = [...new Set(orders.map((o: any) => o.user_id))];
    const profiles = ids.length ? must(await db.from('profiles').select('id, name, phone, email').in('id', ids)) : [];
    const byId = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
    return { orders: orders.map((o: any) => ({ ...o, buyer: byId[o.user_id] || null })) };
  },

  async adminReview(user, { orderId, approve, note }) {
    await requireAdmin(user.id);
    const o = must(await db.from('orders').select('*, products(title_en, title_bn)').eq('id', str(orderId)).single());
    if (o.status !== 'pending') fail('already-reviewed');
    const reviewed = { reviewed_at: new Date().toISOString(), note: str(note, 300) };
    if (!approve) {
      must(await db.from('orders').update({ status: 'rejected', ...reviewed }).eq('id', o.id));
      return {};
    }
    const code = makeCode();
    must(await db.from('access_codes').insert({ code, order_id: o.id, user_id: o.user_id, product_id: o.product_id }));
    must(await db.from('orders').update({ status: 'approved', ...reviewed }).eq('id', o.id));
    const { data: { user: buyer } } = await db.auth.admin.getUserById(o.user_id);
    const emailed = buyer?.email ? await sendCode(buyer.email, code, o.products) : false;
    // The admin page shows the code too, in case the email does not arrive
    return { code, emailed };
  },

  async adminResetDevices(user, { email }) {
    await requireAdmin(user.id);
    const p = must(await db.from('profiles').select('id').ilike('email', str(email)).maybeSingle());
    if (!p) fail('no-user');
    must(await db.from('devices').delete().eq('user_id', p.id));
    return {};
  }
};

// ===== Helpers =====
async function hasCourse(userId: string) {
  const rows = must(await db.from('entitlements').select('id').eq('user_id', userId).eq('kind', 'course').gt('expires_at', new Date().toISOString()).limit(1));
  return rows.length > 0;
}

async function requireDevice(userId: string, deviceId: string) {
  if (!deviceId) fail('bad-device');
  const rows = must(await db.from('devices').select('device_id').eq('user_id', userId).eq('device_id', deviceId));
  if (!rows.length) fail('device-unknown');
}

async function requireAdmin(userId: string) {
  const p = must(await db.from('profiles').select('is_admin').eq('id', userId).single());
  if (!p.is_admin) fail('not-admin');
}

// Uses one attempt of a single-test purchase, or checks for an active course of the same exam
async function useAttempt(userId: string, t: { id: string; exam: string }) {
  const now = new Date().toISOString();
  const course = must(await db.from('entitlements').select('id').eq('user_id', userId).eq('kind', 'course').eq('exam', t.exam).gt('expires_at', now).limit(1));
  if (course.length) return;
  const single = must(await db.from('entitlements').select('id, attempts_left').eq('user_id', userId).eq('kind', 'test').eq('test', t.id).gt('attempts_left', 0).limit(1));
  if (!single.length) fail('not-bought');
  must(await db.from('entitlements').update({ attempts_left: single[0].attempts_left - 1 }).eq('id', single[0].id));
}

// Grades sessions whose time ran out without a submit (browser closed), using the saved answers
async function closeExpired(userId: string) {
  const cutoff = new Date(Date.now() - GRACE_MS).toISOString();
  const expired = must(await db.from('exam_sessions').select('id, test, answers').eq('user_id', userId).is('submitted_at', null).lt('ends_at', cutoff));
  for (const s of expired) {
    const t = must(await db.from('tests').select('key').eq('id', s.test).single());
    must(await db.from('exam_sessions').update({ submitted_at: new Date().toISOString(), score: grade(t.key, s.answers || {}) }).eq('id', s.id));
  }
}

async function ownSession(userId: string, { sessionId, deviceId }: Body) {
  const s = must(await db.from('exam_sessions').select('*').eq('id', str(sessionId, 64)).eq('user_id', userId).maybeSingle());
  if (!s) fail('bad-session');
  if (s.submitted_at) fail('submitted');
  if (s.device_id !== str(deviceId, 64)) fail('taken');
  return s;
}

function cleanAnswers(raw: unknown) {
  const out: Record<string, number | null> = {};
  if (raw && typeof raw === 'object') {
    for (const [id, v] of Object.entries(raw as Record<string, unknown>).slice(0, 500)) {
      out[str(id, 40)] = Number.isInteger(v) ? v as number : null;
    }
  }
  return out;
}

// Same scaled scoring as the real score report. key.answers: { id: [correct index, category] }
function grade(key: { level: string; answers: Record<string, [number, string]> }, answers: Record<string, number | null>) {
  const cfg = SCORING[key.level];
  const stats: Record<string, { correct: number; total: number }> = {};
  Object.keys(cfg.cats).forEach(c => { stats[c] = { correct: 0, total: 0 }; });
  let correct = 0, count = 0;
  for (const [id, [a, cat]] of Object.entries(key.answers)) {
    stats[cat].total++;
    count++;
    if (answers[id] === a) { stats[cat].correct++; correct++; }
  }
  const cats: Record<string, number> = {};
  let total = 0, max = 0, allMin = true;
  for (const [c, def] of Object.entries(cfg.cats)) {
    const s = stats[c];
    const sc = s.total ? Math.round(s.correct / s.total * def.max) : 0;
    cats[c] = sc;
    total += sc;
    max += def.max;
    if (sc < def.min) allMin = false;
  }
  return { total, max, passed: total >= cfg.pass && allMin, correct, count, cats };
}

// SS-XXXX-XXXX without look-alike characters (0/O, 1/I)
function makeCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = [...bytes].map(b => abc[b % abc.length]).join('');
  return `SS-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

// Email through Brevo (free: 300 emails a day, needs only a verified sender address)
async function sendCode(to: string, code: string, product: { title_en: string; title_bn: string }) {
  const key = Deno.env.get('BREVO_API_KEY');
  const from = Deno.env.get('SENDER_EMAIL');
  const site = Deno.env.get('SITE_URL') || '';
  if (!key || !from) return false;
  const html = `
    <p>Thank you for your purchase: <b>${product.title_en}</b><br>আপনার কেনাকাটার জন্য ধন্যবাদ: <b>${product.title_bn}</b></p>
    <p>Your access code / আপনার অ্যাক্সেস কোড:</p>
    <p style="font-size:24px;font-weight:700;letter-spacing:2px">${code}</p>
    <p>Log in, open <b>My Account</b> and enter this code.<br>লগইন করে <b>My Account</b>-এ গিয়ে কোডটি দিন।</p>
    ${site ? `<p><a href="${site}#/account">${site}#/account</a></p>` : ''}
    <p style="color:#888">This code only works with your account. / এই কোড শুধু আপনার অ্যাকাউন্টে কাজ করবে।</p>`;
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: { email: from, name: 'Samurai Syntax' }, to: [{ email: to }], subject: `Your access code: ${code}`, htmlContent: html })
  });
  if (!res.ok) console.error('email failed', res.status, await res.text());
  return res.ok;
}
