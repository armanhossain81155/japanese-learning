// Accounts and payments (see supabase/SETUP.md).
// supabaseUrl / supabaseAnonKey: Supabase → Project Settings → API. The anon key is public by design;
// never put the service_role key here.
// Payment methods: leave a number empty to hide that method.

const BACKEND = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  payment: {
    bkash: { number: '', type: 'Personal' },
    nagad: { number: '', type: 'Personal' },
    rocket: { number: '', type: 'Personal' },
    bank: { bank: '', branch: '', accountName: '', accountNumber: '', routing: '' }
  },
  // Shown to buyers: how soon payments are checked, and where to ask for help
  verifyHours: 6,
  support: ''
};
