-- Samurai Syntax: accounts, purchases and paid mock tests.
-- Run once in Supabase: Dashboard → SQL Editor → paste this file → Run.
-- Browsers can only read their own rows. Everything else (approving orders, codes, questions,
-- answer keys, exam sessions) goes through the `api` edge function, which uses the service role.

-- ===== Users =====
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null default '',
  name text not null default '',
  phone text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Create a profile row for every new sign-up
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, phone)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'name', ''), coalesce(new.raw_user_meta_data->>'phone', ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Browsers that a user has signed in from. Course holders may use at most 2.
create table public.devices (
  user_id uuid not null references auth.users on delete cascade,
  device_id text not null,
  label text not null default '',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (user_id, device_id)
);

-- ===== What can be bought =====
-- kind 'test':   one mock test (test = 'N5/test-02'), `attempts` tries
-- kind 'course': every test of one exam (exam = 'JLPT-N5') for `days` days
create table public.products (
  id text primary key,
  kind text not null check (kind in ('test', 'course')),
  exam text not null,
  test text,
  title_en text not null,
  title_bn text not null,
  price integer not null check (price >= 0),
  days integer,
  attempts integer not null default 1,
  active boolean not null default true,
  sort integer not null default 0
);

-- Questions (no answers) and answer keys of paid tests. Never readable from the browser.
create table public.tests (
  id text primary key,              -- 'N5/test-02'
  exam text not null,               -- 'JLPT-N5'
  title_en text not null,
  title_bn text not null,
  minutes integer not null,
  questions jsonb not null,
  key jsonb not null
);

-- ===== Payments =====
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  product_id text not null references public.products,
  amount integer not null,
  method text not null check (method in ('bkash', 'nagad', 'rocket', 'bank')),
  sender text not null,             -- sender's mobile number or bank account
  trx_id text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
-- The same transaction ID can only be used once per payment method
create unique index orders_trx_unique on public.orders (method, upper(trx_id));

-- Sent by email when an order is approved; only the buyer can redeem it
create table public.access_codes (
  code text primary key,
  order_id uuid not null unique references public.orders on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  product_id text not null references public.products,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);

-- What a user may open, created when a code is redeemed
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  product_id text not null references public.products,
  kind text not null,
  exam text not null,
  test text,
  attempts_left integer,            -- null = unlimited (courses)
  expires_at timestamptz,           -- null = never (single tests)
  created_at timestamptz not null default now()
);

-- One row per exam attempt. Only one unfinished session per user and test can be active.
create table public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  test text not null references public.tests,
  device_id text not null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  last_seen timestamptz not null default now(),
  submitted_at timestamptz,
  answers jsonb,
  tab_switches integer not null default 0,
  shots integer not null default 0,
  score jsonb
);
create index exam_sessions_open on public.exam_sessions (user_id, test) where submitted_at is null;

-- ===== Row level security: browsers read only their own rows =====
alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.products enable row level security;
alter table public.tests enable row level security;
alter table public.orders enable row level security;
alter table public.access_codes enable row level security;
alter table public.entitlements enable row level security;
alter table public.exam_sessions enable row level security;

create policy "own profile" on public.profiles for select using (auth.uid() = id);
create policy "own devices" on public.devices for select using (auth.uid() = user_id);
create policy "products are public" on public.products for select using (active);
create policy "own orders" on public.orders for select using (auth.uid() = user_id);
create policy "own entitlements" on public.entitlements for select using (auth.uid() = user_id);
create policy "own sessions" on public.exam_sessions for select using (auth.uid() = user_id);
-- tests and access_codes: no policies, so only the edge function can read them

-- ===== Example products (change prices and add more in Table Editor → products) =====
insert into public.products (id, kind, exam, test, title_en, title_bn, price, days, attempts, sort) values
  ('jlpt-n5-test-02', 'test', 'JLPT-N5', 'N5/test-02', 'JLPT N5 Model Test 02', 'JLPT N5 মডেল টেস্ট ০২', 150, null, 1, 10),
  ('jlpt-n5-test-03', 'test', 'JLPT-N5', 'N5/test-03', 'JLPT N5 Model Test 03', 'JLPT N5 মডেল টেস্ট ০৩', 150, null, 1, 11),
  ('jlpt-n5-course-3m', 'course', 'JLPT-N5', null, 'JLPT N5 course: all mock tests, 3 months', 'JLPT N5 কোর্স: সব মক টেস্ট, ৩ মাস', 999, 90, 1, 1);
