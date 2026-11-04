// Live exam schedule and backend.
// submitUrl: the Google Apps Script web app URL (see model-tests/live-backend/SETUP.md).
// Leave it empty to test locally: answers are then kept in the browser and can be downloaded.
//
// Each exam:
//   id        unique id, also used to stop a student taking the same exam twice
//   test      question file under model-tests/questions (without .json)
//   start     start time with timezone (+06:00 = Bangladesh)
//   minutes   exam length; the exam closes for everyone at start + minutes
//   alwaysOpen  true = no schedule (only for testing — remove before a real exam)

const LIVE_CONFIG = {
  submitUrl: '',
  exams: [
    {
      id: 'demo-n5-01',
      title: { en: 'Demo: N5 Model Test 01', bn: 'ডেমো: N5 মডেল টেস্ট ০১' },
      level: 'N5',
      test: 'N5/test-01',
      minutes: 90,
      alwaysOpen: true
    },
    {
      id: 'n5-live-2026-11-07',
      title: { en: 'N5 Live Exam — Week 1', bn: 'N5 লাইভ পরীক্ষা — সপ্তাহ ১' },
      level: 'N5',
      test: 'N5/test-01',
      start: '2026-11-07T21:00:00+06:00',
      minutes: 90
    }
  ]
};
