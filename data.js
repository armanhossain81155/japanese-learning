// JLPT mock test data.
// Structure: level -> sections (timed parts) -> groups (question types) -> questions.
// Each group has a scoring category (`cat`) used to compute scaled scores like the real exam.
// Listening scripts: lines starting with 男： / 女： are voiced with different voices.
// Translatable text uses T(english, bangla); Japanese text stays as plain strings.

const T = (en, bn) => ({ en, bn });

const INSTR = {
  reading: T('Choose the correct reading of the underlined word.', 'দাগ দেওয়া শব্দের সঠিক উচ্চারণ বেছে নিন।'),
  ortho: T('Choose the correct way to write the underlined word.', 'দাগ দেওয়া শব্দটির সঠিক লিখিত রূপ বেছে নিন।'),
  context: T('Choose the best word to fill in the blank (　).', 'খালি ঘরে (　) বসানোর জন্য সবচেয়ে উপযুক্ত শব্দটি বেছে নিন।'),
  expression: T('Choose the best expression to fill in the blank (　).', 'খালি ঘরে (　) বসানোর জন্য সবচেয়ে উপযুক্ত অভিব্যক্তিটি বেছে নিন।'),
  formation: T('Choose the best prefix/suffix for the blank (　).', 'খালি ঘরে (　) বসানোর জন্য সঠিক উপসর্গ/প্রত্যয় বেছে নিন।'),
  paraSentence: T('Choose the sentence closest in meaning to the underlined sentence.', 'দাগ দেওয়া বাক্যের অর্থের সবচেয়ে কাছাকাছি বাক্যটি বেছে নিন।'),
  paraWord: T('Choose the word closest in meaning to the underlined word.', 'দাগ দেওয়া শব্দের অর্থের সবচেয়ে কাছাকাছি শব্দটি বেছে নিন।'),
  usage: (w) => T(`Choose the sentence that uses the word「${w}」correctly.`, `「${w}」শব্দটি সঠিকভাবে ব্যবহার করা হয়েছে এমন বাক্যটি বেছে নিন।`),
  star: T('Put the words in the correct order. Which word goes in the ★ position?', 'শব্দগুলো সঠিক ক্রমে সাজান। ★ চিহ্নিত ঘরে কোন শব্দটি বসবে?'),
  passage1: T('Read the passage and answer the question.', 'অনুচ্ছেদটি পড়ে প্রশ্নের উত্তর দিন।'),
  passage2: T('Read the passage and answer the questions.', 'অনুচ্ছেদটি পড়ে প্রশ্নগুলোর উত্তর দিন।'),
  notice: T('Look at the notice and answer the question.', 'নোটিশটি দেখে প্রশ্নের উত্তর দিন।'),
  task: T('Listen to the conversation and choose the correct answer.', 'কথোপকথনটি শুনে সঠিক উত্তর বেছে নিন।'),
  taskFirst: T('Listen to the conversation and choose what the person will do first.', 'কথোপকথনটি শুনে বেছে নিন লোকটি প্রথমে কী করবে।'),
  point: T('Listen and choose the correct answer.', 'শুনে সঠিক উত্তর বেছে নিন।'),
  verbal: T('Listen to the situation. What do you say?', 'পরিস্থিতিটি শুনুন। আপনি কী বলবেন?'),
  quick: T('Listen and choose the best response.', 'শুনে সবচেয়ে উপযুক্ত জবাবটি বেছে নিন।')
};

const TYPE = {
  reading: T('Kanji Reading', 'কাঞ্জি পড়া'),
  ortho: T('Orthography', 'বানান'),
  context: T('Contextual Usage', 'প্রসঙ্গভিত্তিক শব্দ'),
  para: T('Paraphrase', 'সমার্থক'),
  usage: T('Usage', 'ব্যবহার'),
  formation: T('Word Formation', 'শব্দ গঠন'),
  grammar: T('Sentence Grammar', 'বাক্যের ব্যাকরণ'),
  star: T('Sentence Composition', 'বাক্য গঠন'),
  short: T('Short Passage', 'ছোট অনুচ্ছেদ'),
  mid: T('Mid-length Passage', 'মাঝারি অনুচ্ছেদ'),
  info: T('Information Retrieval', 'তথ্য খোঁজা'),
  task: T('Task-based Comprehension', 'কাজভিত্তিক বোঝাপড়া'),
  point: T('Point Comprehension', 'মূল বিষয় বোঝা'),
  verbal: T('Verbal Expressions', 'মৌখিক অভিব্যক্তি'),
  quick: T('Quick Response', 'তাৎক্ষণিক উত্তর')
};

const SECTION = {
  vocab: T('Vocabulary', 'শব্দভাণ্ডার'),
  grammar: T('Grammar · Reading', 'ব্যাকরণ · পঠন'),
  listening: T('Listening', 'শ্রবণ')
};

const OFFICIAL = {
  vocab: T('Language Knowledge (Vocabulary)', 'ভাষাজ্ঞান (শব্দভাণ্ডার)'),
  grammar: T('Language Knowledge (Grammar) · Reading', 'ভাষাজ্ঞান (ব্যাকরণ) · পঠন'),
  listening: T('Listening', 'শ্রবণ')
};

const BEST_RESPONSE = T('Choose the best response.', 'সবচেয়ে উপযুক্ত জবাবটি বেছে নিন।');

const LEVELS = {
  N5: {
    id: 'N5',
    name: 'JLPT N5',
    tag: T('Beginner', 'নতুনদের জন্য'),
    color: 'var(--n5)',
    desc: T('Understand basic Japanese: hiragana, katakana, simple kanji and everyday phrases.',
      'মৌলিক জাপানি বোঝা: হিরাগানা, কাতাকানা, সহজ কাঞ্জি ও প্রতিদিনের বাক্যাংশ।'),
    words: T('~800 words', '~800 শব্দ'),
    kanji: T('~100 kanji', '~100 কাঞ্জি'),
    mockTime: 25,
    official: [
      { part: OFFICIAL.vocab, jp: '言語知識（文字・語彙）', time: 20 },
      { part: OFFICIAL.grammar, jp: '言語知識（文法）・読解', time: 40 },
      { part: OFFICIAL.listening, jp: '聴解', time: 30 }
    ],
    scoring: {
      total: 180,
      pass: 80,
      cats: {
        knowledge: { label: T('Language Knowledge · Reading', 'ভাষাজ্ঞান · পঠন'), max: 120, min: 38 },
        listening: { label: T('Listening', 'শ্রবণ'), max: 60, min: 19 }
      }
    },
    sections: [
      {
        id: 'vocab',
        title: SECTION.vocab,
        jp: '文字・語彙',
        groups: [
          {
            type: TYPE.reading, jp: '漢字読み', cat: 'knowledge', instr: INSTR.reading,
            questions: [
              { q: '<u>山</u>に のぼります。', opts: ['やま', 'かわ', 'うみ', 'そら'], a: 0,
                exp: T('山 (やま) = mountain. かわ = river, うみ = sea, そら = sky.', '山 (やま) = পাহাড়। かわ = নদী, うみ = সমুদ্র, そら = আকাশ।') },
              { q: 'この <u>本</u>は おもしろいです。', opts: ['ぼん', 'ほん', 'もと', 'ぽん'], a: 1,
                exp: T('本 is read ほん on its own. ぼん / ぽん appear only in counters (e.g. 三本 さんぼん).', '本 একা থাকলে ほん পড়া হয়। ぼん / ぽん শুধু গণনাবাচক শব্দে আসে (যেমন 三本 さんぼん)।') },
              { q: '<u>先週</u> えいがを みました。', opts: ['せいしゅう', 'せんしゅ', 'せんしゅう', 'ぜんしゅう'], a: 2,
                exp: T('先週 (せんしゅう) = last week. Watch the long vowel しゅう.', '先週 (せんしゅう) = গত সপ্তাহ। দীর্ঘ স্বর しゅう খেয়াল করুন।') },
              { q: '<u>大きい</u> いぬが います。', opts: ['おきい', 'おおきい', 'だいきい', 'たいきい'], a: 1,
                exp: T('大きい (おおきい) = big. Note the long お sound: おお.', '大きい (おおきい) = বড়। লম্বা お আওয়াজ খেয়াল করুন: おお।') }
            ]
          },
          {
            type: TYPE.ortho, jp: '表記', cat: 'knowledge', instr: INSTR.ortho,
            questions: [
              { q: 'まいにち <u>がっこう</u>へ いきます。', opts: ['字校', '学交', '学校', '字交'], a: 2,
                exp: T('がっこう = 学校 (school). 字 means "character", 交 means "mix".', 'がっこう = 学校 (স্কুল)। 字 মানে "অক্ষর", 交 মানে "মেশা"।') },
              { q: 'よる <u>てれび</u>を みます。', opts: ['テルビ', 'テレビ', 'テレヒ', 'ラレビ'], a: 1,
                exp: T('Loanwords are written in katakana: テレビ (TV). ラ ≠ テ, ヒ ≠ ビ.', 'বিদেশি শব্দ কাতাকানায় লেখা হয়: テレビ (টিভি)। ラ ≠ テ, ヒ ≠ ビ।') }
            ]
          },
          {
            type: TYPE.context, jp: '文脈規定', cat: 'knowledge', instr: INSTR.context,
            questions: [
              { q: 'さむいですから、まどを（　）ください。', opts: ['あけて', 'しめて', 'つけて', 'きて'], a: 1,
                exp: T('It is cold, so "please close (しめて) the window". あけて = open.', 'ঠান্ডা, তাই "জানালা বন্ধ করুন" (しめて)। あけて = খুলুন।') },
              { q: 'わたしは まいあさ コーヒーを（　）。', opts: ['たべます', 'ききます', 'のみます', 'よみます'], a: 2,
                exp: T('You drink (のみます) coffee. たべます = eat, ききます = listen, よみます = read.', 'কফি পান করা হয় (のみます)। たべます = খাওয়া, ききます = শোনা, よみます = পড়া।') }
            ]
          },
          {
            type: TYPE.para, jp: '言い換え類義', cat: 'knowledge', instr: INSTR.paraSentence,
            questions: [
              { q: '<u>この へやは くらいです。</u>', opts: ['この へやは ひろくないです。', 'この へやは あかるくないです。', 'この へやは せまくないです。', 'この へやは しずかでは ありません。'], a: 1,
                exp: T('くらい (dark) = あかるくない (not bright).', 'くらい (অন্ধকার) = あかるくない (উজ্জ্বল নয়)।') }
            ]
          }
        ]
      },
      {
        id: 'grammar',
        title: SECTION.grammar,
        jp: '文法・読解',
        groups: [
          {
            type: TYPE.grammar, jp: '文の文法１', cat: 'knowledge', instr: INSTR.context,
            questions: [
              { q: 'わたしは 日本（　）来ました。', opts: ['を', 'から', 'で', 'と'], a: 1,
                exp: T('から marks the starting point: 日本から来ました = I came from Japan.', 'から শুরুর জায়গা বোঝায়: 日本から来ました = আমি জাপান থেকে এসেছি।') },
              { q: 'つくえの 上（　）ねこが います。', opts: ['に', 'を', 'で', 'へ'], a: 0,
                exp: T('Location of existence (います / あります) takes に.', 'কোনো কিছু কোথায় আছে (います / あります) বোঝাতে に বসে।') },
              { q: 'きのうは あまり（　）。', opts: ['さむかったです', 'さむくなかったです', 'さむいです', 'さむくないです'], a: 1,
                exp: T('あまり + negative = "not very". きのう needs past tense → さむくなかったです.', 'あまり + না-বাচক = "খুব একটা না"। きのう (গতকাল) তাই অতীত কাল লাগবে → さむくなかったです।') },
              { q: 'ごはんを（　）から、はを みがきます。', opts: ['たべる', 'たべた', 'たべて', 'たべ'], a: 2,
                exp: T('て-form + から = "after doing ~": たべてから = after eating.', 'て-রূপ + から = "~ করার পরে": たべてから = খাওয়ার পরে।') }
            ]
          },
          {
            type: TYPE.star, jp: '文の文法２', cat: 'knowledge', instr: INSTR.star,
            questions: [
              { q: 'あそこで ＿＿ ＿＿ <b>★</b> ＿＿ は 田中さんです。<br><small>1. いる　2. 人　3. 本を　4. よんで</small>', opts: ['いる', '人', '本を', 'よんで'], a: 0,
                exp: T('Correct order: 本を よんで いる 人 (the person reading a book). The ★ is the 3rd slot → いる.', 'সঠিক ক্রম: 本を よんで いる 人 (যে লোকটি বই পড়ছে)। ★ তৃতীয় ঘরে → いる।') }
            ]
          },
          {
            type: TYPE.short, jp: '内容理解（短文）', cat: 'knowledge', instr: INSTR.passage1,
            passage: 'わたしは 毎朝 7時に おきます。朝ごはんは パンと たまごを 食べます。それから 8時の バスで 会社へ 行きます。会社は 9時からです。',
            questions: [
              { q: 'この 人は 何で 会社へ 行きますか。', opts: ['でんしゃ', 'バス', 'じてんしゃ', 'あるいて'], a: 1,
                exp: T('「8時の バスで 会社へ 行きます」 — they go by bus.', '「8時の バスで 会社へ 行きます」— তিনি বাসে অফিসে যান।') }
            ]
          },
          {
            type: TYPE.info, jp: '情報検索', cat: 'knowledge', instr: INSTR.notice,
            passage: '<div class="notice"><b>さくら図書館</b><br>月曜日：休み<br>火曜日〜金曜日：9:00〜19:00<br>土曜日・日曜日：10:00〜17:00<br>本は 2週間 かりる ことが できます。</div>',
            questions: [
              { q: '日曜日は 何時まで 図書館に いる ことが できますか。', opts: ['午前10時', '午後5時', '午後7時', '午後9時'], a: 1,
                exp: T('Sat/Sun hours are 10:00〜17:00, so until 5 p.m. (午後5時).', 'শনি/রবিবার খোলা থাকে 10:00〜17:00, তাই বিকেল ৫টা (午後5時) পর্যন্ত।') }
            ]
          }
        ]
      },
      {
        id: 'listening',
        title: SECTION.listening,
        jp: '聴解',
        groups: [
          {
            type: TYPE.task, jp: '課題理解', cat: 'listening', instr: INSTR.task,
            questions: [
              { q: '男の人は 何を 買いますか。', audio: '男の人と女の人が話しています。男の人は何を買いますか。\n女：すみません、牛乳を買ってきてください。\n男：はい。パンもいりますか。\n女：パンはまだあります。卵をおねがいします。\n男：わかりました。牛乳と卵ですね。', opts: ['牛乳と パン', '牛乳と 卵', 'パンと 卵', '卵だけ'], a: 1,
                exp: T('She still has bread, so he buys milk (牛乳) and eggs (卵).', 'পাউরুটি এখনো আছে, তাই লোকটি দুধ (牛乳) আর ডিম (卵) কিনবে।') }
            ]
          },
          {
            type: TYPE.point, jp: 'ポイント理解', cat: 'listening', instr: INSTR.point,
            questions: [
              { q: '女の人は 日曜日 何を しましたか。', audio: '女の人が話しています。女の人は日曜日、何をしましたか。\n女：日曜日は雨でしたから、どこへも行きませんでした。うちで本を読みました。夜は友だちと電話で話しました。', opts: ['山に のぼりました', 'うちで 本を 読みました', '友だちと えいがを 見ました', 'かいものに 行きました'], a: 1,
                exp: T('It rained, so she stayed home and read a book.', 'বৃষ্টি হচ্ছিল, তাই তিনি বাসায় থেকে বই পড়েছেন।') }
            ]
          },
          {
            type: TYPE.verbal, jp: '発話表現', cat: 'listening', instr: INSTR.verbal,
            questions: [
              { q: '友だちの うちに 入ります。何と 言いますか。', audio: '友だちのうちに入ります。何と言いますか。', opts: ['いってきます', 'おじゃまします', 'ただいま', 'おやすみなさい'], a: 1,
                exp: T('おじゃまします is said when entering someone else\'s home. ただいま is for your own home.', 'অন্যের বাসায় ঢোকার সময় おじゃまします বলা হয়। ただいま বলা হয় নিজের বাসায় ফেরার সময়।') }
            ]
          },
          {
            type: TYPE.quick, jp: '即時応答', cat: 'listening', instr: INSTR.quick,
            questions: [
              { q: BEST_RESPONSE, audio: '女：きのうは、ありがとうございました。', opts: ['いいえ、どういたしまして。', 'いただきます。', 'ごちそうさまでした。', 'はじめまして。'], a: 0,
                exp: T('The natural reply to a thank-you is いいえ、どういたしまして.', 'ধন্যবাদের স্বাভাবিক উত্তর: いいえ、どういたしまして।') }
            ]
          }
        ]
      }
    ]
  },

  N4: {
    id: 'N4',
    name: 'JLPT N4',
    tag: T('Elementary', 'প্রাথমিক'),
    color: 'var(--n4)',
    desc: T('Understand basic Japanese used in daily life, slowly spoken conversations and simple texts.',
      'দৈনন্দিন জীবনে ব্যবহৃত মৌলিক জাপানি, ধীরে বলা কথোপকথন ও সহজ লেখা বোঝা।'),
    words: T('~1,500 words', '~1,500 শব্দ'),
    kanji: T('~300 kanji', '~300 কাঞ্জি'),
    mockTime: 30,
    official: [
      { part: OFFICIAL.vocab, jp: '言語知識（文字・語彙）', time: 25 },
      { part: OFFICIAL.grammar, jp: '言語知識（文法）・読解', time: 55 },
      { part: OFFICIAL.listening, jp: '聴解', time: 35 }
    ],
    scoring: {
      total: 180,
      pass: 90,
      cats: {
        knowledge: { label: T('Language Knowledge · Reading', 'ভাষাজ্ঞান · পঠন'), max: 120, min: 38 },
        listening: { label: T('Listening', 'শ্রবণ'), max: 60, min: 19 }
      }
    },
    sections: [
      {
        id: 'vocab',
        title: SECTION.vocab,
        jp: '文字・語彙',
        groups: [
          {
            type: TYPE.reading, jp: '漢字読み', cat: 'knowledge', instr: INSTR.reading,
            questions: [
              { q: '来月 <u>旅行</u>に 行きます。', opts: ['りょうこう', 'りょこう', 'りょこ', 'りょうこ'], a: 1,
                exp: T('旅行 = りょこう (travel). 旅 is りょ (short), not りょう.', '旅行 = りょこう (ভ্রমণ)। 旅 পড়া হয় りょ (ছোট), りょう নয়।') },
              { q: 'この 道は <u>危ない</u>です。', opts: ['あやない', 'きけない', 'あぶない', 'あむない'], a: 2,
                exp: T('危ない = あぶない (dangerous).', '危ない = あぶない (বিপজ্জনক)।') },
              { q: '父は 銀行で <u>働いて</u> います。', opts: ['うごいて', 'はたらいて', 'あるいて', 'ひらいて'], a: 1,
                exp: T('働く = はたらく (to work). 動く (うごく) = to move — similar shape!', '働く = はたらく (কাজ করা)। 動く (うごく) = নড়া — দেখতে প্রায় একই রকম!') }
            ]
          },
          {
            type: TYPE.ortho, jp: '表記', cat: 'knowledge', instr: INSTR.ortho,
            questions: [
              { q: 'この りんごは <u>あじ</u>が いいです。', opts: ['未', '味', '妹', '昧'], a: 1,
                exp: T('あじ (taste) = 味. The 口 radical relates to the mouth.', 'あじ (স্বাদ) = 味। 口 অংশটি মুখের সাথে সম্পর্কিত।') },
              { q: '駅で ともだちを <u>まちました</u>。', opts: ['持ちました', '特ちました', '待ちました', '侍ちました'], a: 2,
                exp: T('まつ (to wait) = 待つ. 持つ (もつ) = to hold.', 'まつ (অপেক্ষা করা) = 待つ। 持つ (もつ) = ধরে রাখা।') }
            ]
          },
          {
            type: TYPE.context, jp: '文脈規定', cat: 'knowledge', instr: INSTR.context,
            questions: [
              { q: '試験に（　）ように、毎日 勉強して います。', opts: ['合格する', '失敗する', '出席する', '予約する'], a: 0,
                exp: T('〜ように = "so that". Study every day so that you pass (合格する).', '〜ように = "যাতে"। পাস করার জন্য (合格する) প্রতিদিন পড়াশোনা করছি।') },
              { q: '熱が あるので、病院で 薬を（　）。', opts: ['あげました', 'つくりました', 'もらいました', 'なおしました'], a: 2,
                exp: T('You receive (もらいました) medicine at the hospital.', 'হাসপাতাল থেকে ওষুধ পাওয়া যায় (もらいました)।') }
            ]
          },
          {
            type: TYPE.para, jp: '言い換え類義', cat: 'knowledge', instr: INSTR.paraSentence,
            questions: [
              { q: '<u>きのうは ひまでした。</u>', opts: ['きのうは いそがしかったです。', 'きのうは やすみでした。', 'きのうは いそがしくなかったです。', 'きのうは たのしかったです。'], a: 2,
                exp: T('ひま (free time) ≈ いそがしくない (not busy).', 'ひま (অবসর) ≈ いそがしくない (ব্যস্ত নয়)।') }
            ]
          },
          {
            type: TYPE.usage, jp: '用法', cat: 'knowledge', instr: INSTR.usage('えんりょ'),
            questions: [
              { q: '<b>えんりょ</b>', opts: ['どうぞ えんりょしないで たくさん 食べて ください。', '電車が えんりょして、学校に おくれました。', '明日の 会議を えんりょに しました。', 'この かばんは えんりょで 買いました。'], a: 0,
                exp: T('えんりょ (遠慮) = holding back / hesitation. えんりょしないで = "don\'t hold back".', 'えんりょ (遠慮) = সংকোচ / দ্বিধা। えんりょしないで = "সংকোচ করবেন না"।') }
            ]
          }
        ]
      },
      {
        id: 'grammar',
        title: SECTION.grammar,
        jp: '文法・読解',
        groups: [
          {
            type: TYPE.grammar, jp: '文の文法１', cat: 'knowledge', instr: INSTR.context,
            questions: [
              { q: '日本へ 行った（　）が ありますか。', opts: ['もの', 'こと', 'ところ', 'の'], a: 1,
                exp: T('た-form + ことが ある = "have done before" (experience).', 'た-রূপ + ことが ある = "আগে কখনো করেছি" (অভিজ্ঞতা)।') },
              { q: '子どもの とき、母に 野菜を（　）。', opts: ['食べさせました', '食べられました', '食べさせられました', '食べました'], a: 2,
                exp: T('Causative-passive (させられる) = "was made to eat" by my mother.', 'প্রযোজক-কর্মবাচ্য (させられる) = মা আমাকে "খেতে বাধ্য করেছিলেন"।') },
              { q: '部屋に 入ると、窓が 開けて（　）。', opts: ['いました', 'ありました', 'おきました', 'しまいました'], a: 1,
                exp: T('Noun が + transitive て-form + ある describes a resulting state: 窓が開けてありました.', 'বিশেষ্য が + সকর্মক ক্রিয়ার て-রূপ + ある = কেউ করে রেখেছে এমন অবস্থা: 窓が開けてありました।') },
              { q: '暗く（　）前に、うちへ 帰りましょう。', opts: ['なる', 'なった', 'なって', 'なり'], a: 0,
                exp: T('前に always takes the dictionary form: なる前に = before it gets dark.', '前に-এর আগে সবসময় অভিধান রূপ বসে: なる前に = অন্ধকার হওয়ার আগে।') }
            ]
          },
          {
            type: TYPE.star, jp: '文の文法２', cat: 'knowledge', instr: INSTR.star,
            questions: [
              { q: 'この アパートは ＿＿ ＿＿ <b>★</b> ＿＿ 便利です。<br><small>1. 近くて　2. から　3. とても　4. 駅</small>', opts: ['近くて', 'から', 'とても', '駅'], a: 0,
                exp: T('Correct order: 駅 から 近くて とても 便利です. The ★ is the 3rd slot → 近くて.', 'সঠিক ক্রম: 駅 から 近くて とても 便利です। ★ তৃতীয় ঘরে → 近くて।') }
            ]
          },
          {
            type: TYPE.mid, jp: '内容理解（中文）', cat: 'knowledge', instr: INSTR.passage2,
            passage: '先週の 土曜日、友だちと いっしょに 山へ ハイキングに 行きました。朝は 天気が よかったですが、昼ごろから 雨が 降り始めました。かさを 持って いなかったので、山の 上の 小さい 店で かさを 買いました。雨は 夕方まで やみませんでしたが、店の 人が 温かい お茶を くれたので、うれしかったです。',
            questions: [
              { q: 'どうして かさを 買いましたか。', opts: ['かさが こわれたから', 'かさを 持って いなかったから', '友だちに あげたかったから', '店の 人が すすめたから'], a: 1,
                exp: T('「かさを 持って いなかったので」 — they didn\'t have an umbrella.', '「かさを 持って いなかったので」— তার কাছে ছাতা ছিল না।') },
              { q: 'この 人は 何が うれしかったですか。', opts: ['雨が やんだ こと', 'かさが 安かった こと', '店の 人が お茶を くれた こと', '天気が よかった こと'], a: 2,
                exp: T('「店の 人が 温かい お茶を くれたので、うれしかったです」', '「店の 人が 温かい お茶を くれたので、うれしかったです」— দোকানের লোক গরম চা দিয়েছিল, তাই খুশি হয়েছিলেন।') }
            ]
          }
        ]
      },
      {
        id: 'listening',
        title: SECTION.listening,
        jp: '聴解',
        groups: [
          {
            type: TYPE.task, jp: '課題理解', cat: 'listening', instr: INSTR.task,
            questions: [
              { q: '二人は 何時に 会いますか。', audio: '男の人と女の人が話しています。二人は何時に会いますか。\n男：明日の映画、何時に会おうか。\n女：映画は2時からだよね。1時半に駅はどう？\n男：もう少し早いほうがいいな。昼ごはんも食べたいし。\n女：じゃあ、12時半にしよう。\n男：うん、そうしよう。', opts: ['12時', '12時半', '1時半', '2時'], a: 1,
                exp: T('They want lunch first, so they meet at 12:30 (12時半).', 'তারা আগে দুপুরের খাবার খেতে চায়, তাই 12:30-এ (12時半) দেখা করবে।') }
            ]
          },
          {
            type: TYPE.point, jp: 'ポイント理解', cat: 'listening', instr: INSTR.point,
            questions: [
              { q: '男の人は どうして 会社を 休みましたか。', audio: '男の人が話しています。男の人はどうして会社を休みましたか。\n男：きのうは会社を休みました。かぜではありません。子どもが熱を出したので、病院へ連れて行ったんです。', opts: ['かぜを ひいたから', '子どもが 病気だったから', '病院で 働いて いるから', '雨が ふったから'], a: 1,
                exp: T('Not a cold — his child had a fever, so he took them to hospital.', 'সর্দি না — তার সন্তানের জ্বর হয়েছিল, তাই হাসপাতালে নিয়ে গিয়েছিলেন।') }
            ]
          },
          {
            type: TYPE.verbal, jp: '発話表現', cat: 'listening', instr: INSTR.verbal,
            questions: [
              { q: '先生の 部屋に 入ります。何と 言いますか。', audio: '先生の部屋に入ります。何と言いますか。', opts: ['しつれいします。', 'おさきに しつれいします。', 'おせわに なりました。', 'おまたせしました。'], a: 0,
                exp: T('しつれいします is said when entering a teacher\'s / boss\'s room. おさきに… is used when leaving before others.', 'শিক্ষক বা বসের রুমে ঢোকার সময় しつれいします বলা হয়। おさきに… বলা হয় অন্যদের আগে চলে যাওয়ার সময়।') }
            ]
          },
          {
            type: TYPE.quick, jp: '即時応答', cat: 'listening', instr: INSTR.quick,
            questions: [
              { q: BEST_RESPONSE, audio: '男：すみません、この席、空いていますか。', opts: ['ええ、どうぞ。', 'いいえ、どういたしまして。', 'はい、空きました。', 'ええ、すわりました。'], a: 0,
                exp: T('"Is this seat free?" → ええ、どうぞ (Yes, go ahead).', '"এই সিটটা কি খালি?" → ええ、どうぞ (হ্যাঁ, বসুন)।') }
            ]
          }
        ]
      }
    ]
  },

  N3: {
    id: 'N3',
    name: 'JLPT N3',
    tag: T('Intermediate', 'মধ্যম'),
    color: 'var(--n3)',
    desc: T('Understand Japanese used in everyday situations to a certain degree, including newspaper headlines and natural-speed conversations.',
      'দৈনন্দিন পরিস্থিতিতে ব্যবহৃত জাপানি অনেকটা বোঝা, যেমন খবরের কাগজের শিরোনাম ও স্বাভাবিক গতির কথোপকথন।'),
    words: T('~3,750 words', '~3,750 শব্দ'),
    kanji: T('~650 kanji', '~650 কাঞ্জি'),
    mockTime: 40,
    official: [
      { part: OFFICIAL.vocab, jp: '言語知識（文字・語彙）', time: 30 },
      { part: OFFICIAL.grammar, jp: '言語知識（文法）・読解', time: 70 },
      { part: OFFICIAL.listening, jp: '聴解', time: 40 }
    ],
    scoring: {
      total: 180,
      pass: 95,
      cats: {
        knowledge: { label: T('Language Knowledge (Vocab · Grammar)', 'ভাষাজ্ঞান (শব্দ · ব্যাকরণ)'), max: 60, min: 19 },
        reading: { label: T('Reading', 'পঠন'), max: 60, min: 19 },
        listening: { label: T('Listening', 'শ্রবণ'), max: 60, min: 19 }
      }
    },
    sections: [
      {
        id: 'vocab',
        title: SECTION.vocab,
        jp: '文字・語彙',
        groups: [
          {
            type: TYPE.reading, jp: '漢字読み', cat: 'knowledge', instr: INSTR.reading,
            questions: [
              { q: '彼の意見に<u>賛成</u>です。', opts: ['さんせ', 'ざんせい', 'さんせい', 'さんぜい'], a: 2,
                exp: T('賛成 = さんせい (agreement). 反対 (はんたい) is the opposite.', '賛成 = さんせい (সমর্থন)। এর বিপরীত 反対 (はんたい)।') },
              { q: '部屋を<u>片付けて</u>ください。', opts: ['かたずけて', 'かたづけて', 'へんづけて', 'かたつけて'], a: 1,
                exp: T('片付ける = かたづける. かたずける is a very common spelling mistake.', '片付ける = かたづける। かたずける খুবই সাধারণ একটি বানান ভুল।') },
              { q: '新しい制度が<u>導入</u>された。', opts: ['どうにゅう', 'とうにゅう', 'どうにゅ', 'どうじゅう'], a: 0,
                exp: T('導入 = どうにゅう (introduction / adoption of a system).', '導入 = どうにゅう (কোনো ব্যবস্থা চালু করা)।') }
            ]
          },
          {
            type: TYPE.ortho, jp: '表記', cat: 'knowledge', instr: INSTR.ortho,
            questions: [
              { q: '試合に<u>まけて</u>くやしい。', opts: ['貸けて', '負けて', '責けて', '員けて'], a: 1,
                exp: T('まける (to lose) = 負ける.', 'まける (হেরে যাওয়া) = 負ける।') },
              { q: '毎月<u>ちょきん</u>をしている。', opts: ['貯全', '著金', '貯金', '貯銀'], a: 2,
                exp: T('ちょきん (savings) = 貯金.', 'ちょきん (সঞ্চয়) = 貯金।') }
            ]
          },
          {
            type: TYPE.formation, jp: '語形成', cat: 'knowledge', instr: INSTR.formation,
            questions: [
              { q: 'この問題は（　）解決のままだ。', opts: ['不', '無', '未', '非'], a: 2,
                exp: T('未 = "not yet": 未解決 (unsolved). Also 未成年, 未完成.', '未 = "এখনো হয়নি": 未解決 (অমীমাংসিত)। যেমন 未成年, 未完成।') }
            ]
          },
          {
            type: TYPE.context, jp: '文脈規定', cat: 'knowledge', instr: INSTR.context,
            questions: [
              { q: '電車が遅れたので、会議に10分（　）してしまった。', opts: ['欠席', '遅刻', '早退', '出発'], a: 1,
                exp: T('遅刻 (ちこく) = being late. 欠席 = absence, 早退 = leaving early.', '遅刻 (ちこく) = দেরি করা। 欠席 = অনুপস্থিতি, 早退 = আগে চলে যাওয়া।') },
              { q: 'この薬は頭痛によく（　）。', opts: ['治る', '効く', '助かる', '通う'], a: 1,
                exp: T('薬が効く = medicine works/is effective. 治る is for the illness itself getting better.', '薬が効く = ওষুধ কাজ করে। 治る বলা হয় অসুখ নিজে সেরে গেলে।') }
            ]
          },
          {
            type: TYPE.para, jp: '言い換え類義', cat: 'knowledge', instr: INSTR.paraWord,
            questions: [
              { q: '彼は<u>たちまち</u>寝てしまった。', opts: ['ゆっくり', 'すぐに', 'やっと', 'ときどき'], a: 1,
                exp: T('たちまち = instantly, in no time ≈ すぐに.', 'たちまち = মুহূর্তের মধ্যে ≈ すぐに।') }
            ]
          },
          {
            type: TYPE.usage, jp: '用法', cat: 'knowledge', instr: INSTR.usage('さっぱり'),
            questions: [
              { q: '<b>さっぱり</b>', opts: ['シャワーを浴びて、さっぱりした。', '雨がさっぱり降っている。', '彼はさっぱり部屋に入ってきた。', 'この料理はさっぱり量が多い。'], a: 0,
                exp: T('さっぱりする = to feel refreshed / clean. It also means "not at all" with negatives (さっぱりわからない).', 'さっぱりする = ঝরঝরে / সতেজ লাগা। না-বাচকের সাথে "একদমই না" অর্থও হয় (さっぱりわからない)।') }
            ]
          }
        ]
      },
      {
        id: 'grammar',
        title: SECTION.grammar,
        jp: '文法・読解',
        groups: [
          {
            type: TYPE.grammar, jp: '文の文法１', cat: 'knowledge', instr: INSTR.expression,
            questions: [
              { q: '雨（　）、試合は予定どおり行われた。', opts: ['によって', 'にもかかわらず', 'について', 'にとって'], a: 1,
                exp: T('〜にもかかわらず = "despite ~". Despite the rain, the match was held as planned.', '〜にもかかわらず = "~ সত্ত্বেও"। বৃষ্টি সত্ত্বেও খেলা নির্ধারিত সময়েই হয়েছে।') },
              { q: '彼女は歌手（　）、女優としても活躍している。', opts: ['ばかりに', 'からこそ', 'だけでなく', 'にしては'], a: 2,
                exp: T('〜だけでなく…も = "not only ~ but also …".', '〜だけでなく…も = "শুধু ~ নয়, …ও"।') },
              { q: '明日がしめきりだから、この仕事は今日中に終わらせる（　）。', opts: ['しかない', 'わけがない', 'はずがない', 'ことがない'], a: 0,
                exp: T('〜しかない = "have no choice but to ~".', '〜しかない = "~ করা ছাড়া উপায় নেই"।') },
              { q: '先生が（　）とおりに、やってみてください。', opts: ['申した', 'おっしゃった', 'いらっしゃった', 'うかがった'], a: 1,
                exp: T('おっしゃる is the honorific (尊敬語) of 言う, used for the teacher. 申す is humble.', 'おっしゃる হলো 言う-এর সম্মানসূচক রূপ (尊敬語), শিক্ষকের জন্য ব্যবহার হয়। 申す বিনয়সূচক রূপ।') }
            ]
          },
          {
            type: TYPE.star, jp: '文の文法２', cat: 'knowledge', instr: INSTR.star,
            questions: [
              { q: 'この店のラーメンは＿＿ ＿＿ <b>★</b> ＿＿おいしい。<br><small>1. あきない　2. 食べても　3. ほど　4. 何度</small>', opts: ['あきない', '食べても', 'ほど', '何度'], a: 0,
                exp: T('Correct order: 何度 食べても あきない ほど おいしい (so good you never get tired of it). ★ = あきない.', 'সঠিক ক্রম: 何度 食べても あきない ほど おいしい (এত মজা যে কখনো একঘেয়ে লাগে না)। ★ = あきない।') }
            ]
          },
          {
            type: TYPE.mid, jp: '内容理解（中文）', cat: 'reading', instr: INSTR.passage2,
            passage: '最近、スマートフォンで本を読む人が増えている。電車の中でも気軽に読めるし、重い本を持ち歩く必要もない。しかし、私は今でも紙の本のほうが好きだ。ページをめくる感覚や紙のにおい、そして読み終わった本が本棚に並んでいく喜びは、画面では味わえないからだ。もちろん、どちらが正しいというわけではない。大切なのは、自分に合った方法で読書を楽しむことだろう。',
            questions: [
              { q: '筆者が紙の本を好きな理由は何か。', opts: ['電子書籍より安いから', '画面では得られない楽しさがあるから', '目が疲れないから', '電車の中で読みやすいから'], a: 1,
                exp: T('「…喜びは、画面では味わえないからだ」 — paper books give joys a screen can\'t.', '「…喜びは、画面では味わえないからだ」— কাগজের বইয়ে এমন আনন্দ আছে যা স্ক্রিনে পাওয়া যায় না।') },
              { q: '筆者が一番言いたいことは何か。', opts: ['紙の本を読むべきだ。', 'スマートフォンで読むほうが便利だ。', '読書をする人が減っている。', '自分に合った方法で読書を楽しめばよい。'], a: 3,
                exp: T('The conclusion: 「大切なのは、自分に合った方法で読書を楽しむことだろう」.', 'উপসংহার: 「大切なのは、自分に合った方法で読書を楽しむことだろう」— নিজের পছন্দের উপায়ে পড়াটাই আসল।') }
            ]
          }
        ]
      },
      {
        id: 'listening',
        title: SECTION.listening,
        jp: '聴解',
        groups: [
          {
            type: TYPE.task, jp: '課題理解', cat: 'listening', instr: INSTR.taskFirst,
            questions: [
              { q: '男の人はこれからまず何をしますか。', audio: '会社で男の人と女の人が話しています。男の人はこれからまず何をしますか。\n女：山田さん、明日の会議の資料、もうできた？\n男：はい、さっき完成しました。これからコピーします。\n女：あ、その前に部長に一度見てもらって。数字を確認したいって言ってたから。\n男：わかりました。じゃ、すぐ部長のところへ持っていきます。', opts: ['資料をコピーする', '部長に資料を見せる', '資料を作る', '会議室を予約する'], a: 1,
                exp: T('「その前に部長に一度見てもらって」 — before copying, show it to the manager.', '「その前に部長に一度見てもらって」— কপি করার আগে ম্যানেজারকে দেখাতে হবে।') }
            ]
          },
          {
            type: TYPE.point, jp: 'ポイント理解', cat: 'listening', instr: INSTR.point,
            questions: [
              { q: '女の人はどうして引っ越しますか。', audio: '女の人と男の人が話しています。女の人はどうして引っ越しますか。\n男：引っ越すんだって？今のアパート、駅から近くて便利なのに。\n女：うん、便利なんだけどね。となりの部屋の音がうるさくて、夜眠れないの。\n男：それは大変だね。\n女：家賃は少し高くなるけど、静かなところがいいと思って。', opts: ['家賃が高いから', '駅から遠いから', 'となりの音がうるさいから', '部屋がせまいから'], a: 2,
                exp: T('The current place is convenient, but the noise next door keeps her awake.', 'বর্তমান বাসাটা সুবিধাজনক, কিন্তু পাশের রুমের শব্দে তিনি রাতে ঘুমাতে পারেন না।') }
            ]
          },
          {
            type: TYPE.verbal, jp: '発話表現', cat: 'listening', instr: INSTR.verbal,
            questions: [
              { q: '友だちに借りた本を汚してしまいました。何と言いますか。', audio: '友だちに借りた本を汚してしまいました。何と言いますか。', opts: ['本、汚しちゃってごめんね。', '本、汚してくれてありがとう。', '本、汚してもいい？', '本、汚さないでね。'], a: 0,
                exp: T('You need to apologise: 汚しちゃってごめんね.', 'নিজের ভুলের জন্য ক্ষমা চাইতে হবে: 汚しちゃってごめんね।') }
            ]
          },
          {
            type: TYPE.quick, jp: '即時応答', cat: 'listening', instr: INSTR.quick,
            questions: [
              { q: BEST_RESPONSE, audio: '男：この書類、明日までにお願いできますか。', opts: ['はい、かしこまりました。', 'いいえ、おかげさまで。', 'はい、お願いします。', 'ええ、いただきます。'], a: 0,
                exp: T('A polite request at work → かしこまりました (certainly).', 'অফিসে ভদ্র অনুরোধের উত্তর → かしこまりました (অবশ্যই)।') }
            ]
          }
        ]
      }
    ]
  }
};

// Gojūon chart for the Study page. Spaces are blank cells.
const KANA_ROMAJI = [
  ['a', 'i', 'u', 'e', 'o'],
  ['ka', 'ki', 'ku', 'ke', 'ko'],
  ['sa', 'shi', 'su', 'se', 'so'],
  ['ta', 'chi', 'tsu', 'te', 'to'],
  ['na', 'ni', 'nu', 'ne', 'no'],
  ['ha', 'hi', 'fu', 'he', 'ho'],
  ['ma', 'mi', 'mu', 'me', 'mo'],
  ['ya', '', 'yu', '', 'yo'],
  ['ra', 'ri', 'ru', 're', 'ro'],
  ['wa', '', '', '', 'wo'],
  ['n', '', '', '', '']
];

const KANA = {
  hiragana: [
    'あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの',
    'はひふへほ', 'まみむめも', 'や ゆ よ', 'らりるれろ', 'わ   を', 'ん    '
  ],
  katakana: [
    'アイウエオ', 'カキクケコ', 'サシスセソ', 'タチツテト', 'ナニヌネノ',
    'ハヒフヘホ', 'マミムメモ', 'ヤ ユ ヨ', 'ラリルレロ', 'ワ   ヲ', 'ン    '
  ]
};

// Dakuten (゛) and handakuten (゜) characters. ぢ/づ are read ji/zu, same as じ/ず.
const KANA_DAKUTEN_ROMAJI = [
  ['ga', 'gi', 'gu', 'ge', 'go'],
  ['za', 'ji', 'zu', 'ze', 'zo'],
  ['da', 'ji', 'zu', 'de', 'do'],
  ['ba', 'bi', 'bu', 'be', 'bo'],
  ['pa', 'pi', 'pu', 'pe', 'po']
];

const KANA_DAKUTEN = {
  hiragana: ['がぎぐげご', 'ざじずぜぞ', 'だぢづでど', 'ばびぶべぼ', 'ぱぴぷぺぽ'],
  katakana: ['ガギグゲゴ', 'ザジズゼゾ', 'ダヂヅデド', 'バビブベボ', 'パピプペポ']
};

const TIPS = [
  {
    title: T('Learn kana first', 'আগে কানা শিখুন'),
    text: T('Master hiragana and katakana before anything else — every JLPT level assumes you can read them fluently.',
      'অন্য কিছুর আগে হিরাগানা ও কাতাকানা আয়ত্ত করুন — JLPT-এর প্রতিটি লেভেলে ধরে নেওয়া হয় যে আপনি এগুলো সাবলীলভাবে পড়তে পারেন।')
  },
  {
    title: T('Time your practice', 'সময় ধরে প্র্যাকটিস করুন'),
    text: T('Reading is where most people run out of time. Practise with a timer from day one.',
      'বেশিরভাগ মানুষের পঠন অংশেই সময় শেষ হয়ে যায়। প্রথম দিন থেকেই টাইমার নিয়ে প্র্যাকটিস করুন।')
  },
  {
    title: T('Every section counts', 'প্রতিটি সেকশন গুরুত্বপূর্ণ'),
    text: T('You need the sectional minimum in each section, not just the total. A strong reading score cannot save a failed listening section.',
      'শুধু মোট নম্বর নয়, প্রতিটি সেকশনে ন্যূনতম নম্বর লাগবে। পঠনে ভালো করলেও শ্রবণে ন্যূনতম না পেলে পাস হবে না।')
  },
  {
    title: T('Never leave blanks', 'কোনো ঘর খালি রাখবেন না'),
    text: T('There is no penalty for wrong answers. If time runs out, guess.',
      'ভুল উত্তরে নম্বর কাটা যায় না। সময় শেষ হয়ে এলে আন্দাজে উত্তর দিন।')
  }
];

// Exams shown on the home page. Only JLPT has tests so far; the others are announced as coming soon.
const EXAMS = [
  {
    id: 'jlpt', name: 'JLPT', jp: '日本語能力試験', color: 'var(--n3)', ready: true, href: '#/tests', shop: 'JLPT',
    desc: T('Japanese-Language Proficiency Test. Needed for study, jobs and visas in Japan.',
      'জাপানি ভাষা দক্ষতা পরীক্ষা। জাপানে পড়াশোনা, চাকরি ও ভিসার জন্য দরকার।'),
    chips: ['N5', 'N4', 'N3']
  },
  {
    id: 'jft', name: 'JFT-Basic', jp: '国際交流基金日本語基礎テスト', color: 'var(--n4)',
    desc: T('Japan Foundation Test for Basic Japanese (A2). Accepted for the SSW visa. Computer-based, scored 10–250, pass mark 200.',
      'জাপান ফাউন্ডেশনের বেসিক জাপানি টেস্ট (A2)। SSW ভিসার জন্য গ্রহণযোগ্য। কম্পিউটারে পরীক্ষা, স্কোর ১০–২৫০, পাস মার্ক ২০০।'),
    chips: [T('Script & Vocabulary', 'লিপি ও শব্দ'), T('Conversation', 'কথোপকথন'), T('Listening', 'শ্রবণ'), T('Reading', 'পঠন')]
  },
  {
    id: 'ssw', name: 'SSW', jp: '特定技能評価試験', color: 'var(--warn)',
    desc: T('Specified Skilled Worker skill tests. Each job field has its own test.',
      'স্পেসিফাইড স্কিলড ওয়ার্কার (তোকুতেই গিনো) দক্ষতা পরীক্ষা। প্রতিটি কাজের ক্ষেত্রের আলাদা পরীক্ষা।'),
    chips: ['介護', '外食業', '飲食料品製造業', '農業', 'ビルクリーニング']
  },
  {
    id: 'nat', name: 'NAT-TEST', jp: '日本語NAT-TEST', color: 'var(--n5)',
    desc: T('Japanese proficiency test held every two months. Levels 5Q to 1Q match JLPT N5 to N1.',
      'প্রতি দুই মাস পর পর হওয়া জাপানি ভাষা পরীক্ষা। ৫কিউ থেকে ১কিউ লেভেল JLPT N5 থেকে N1-এর সমান।'),
    chips: ['5級', '4級', '3級', '2級', '1級']
  }
];
