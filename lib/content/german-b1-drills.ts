/**
 * The B1 drill bank used by the existing /german/b1-grammar course.
 *
 * Each module maps to one of the twelve B1 grammar units (module 1 → unit13,
 * module 12 → unit24). The card added by this file turns the single-question
 * quiz into a bank that cycles through every drill for the current unit.
 *
 * Answer keys are validated offline by scripts/validate-german-b1-drills.mjs.
 */

export type GermanB1Drill = {
  id: string;
  prompt: string;
  translation: string;
  options: string[];
  correct: number;
  why: string;
};

export type GermanB1DrillModule = {
  id: string;
  number: number;
  title: string;
  fa: string;
  drills: GermanB1Drill[];
};

export const germanB1DrillModules: GermanB1DrillModule[] = [
  {
    "id": "dativ",
    "number": 1,
    "title": "Präpositionen mit Dativ",
    "fa": "حروف اضافه با داتیو",
    "drills": [
      {
        "id": "d1",
        "prompt": "Ich fahre ___ Bus zur Arbeit.",
        "translation": "من با اتوبوس به محل کار می‌روم.",
        "options": [
          "mit dem",
          "mit den",
          "mit der",
          "mit die"
        ],
        "correct": 0,
        "why": "mit همیشه داتیو می‌گیرد؛ der Bus در داتیو می‌شود dem Bus."
      },
      {
        "id": "d2",
        "prompt": "Sie kommt ___ Schweiz.",
        "translation": "او از سوئیس می‌آید.",
        "options": [
          "aus die",
          "aus der",
          "aus den",
          "aus dem"
        ],
        "correct": 1,
        "why": "die Schweiz مؤنث است و در داتیو بعد از aus به der Schweiz تبدیل می‌شود."
      },
      {
        "id": "d3",
        "prompt": "Ich wohne ___ drei Monaten in Köln.",
        "translation": "سه ماه است در کلن زندگی می‌کنم.",
        "options": [
          "seit",
          "nach",
          "zu",
          "gegenüber"
        ],
        "correct": 0,
        "why": "seit برای بازه‌ای است که از گذشته شروع شده و هنوز ادامه دارد."
      },
      {
        "id": "d4",
        "prompt": "Wir gehen ___ Arzt.",
        "translation": "ما به مطب پزشک می‌رویم.",
        "options": [
          "zum",
          "zur",
          "beim",
          "vom"
        ],
        "correct": 0,
        "why": "zu + dem = zum؛ der Arzt مذکر است."
      },
      {
        "id": "d5",
        "prompt": "Er kommt gerade ___ der Arbeit.",
        "translation": "او همین حالا از سر کار می‌آید.",
        "options": [
          "von",
          "aus",
          "bei",
          "zu"
        ],
        "correct": 0,
        "why": "von der Arbeit یعنی از محل کار؛ aus برای «از داخل» چیزی است."
      },
      {
        "id": "d6",
        "prompt": "Das Café liegt ___ Bahnhof.",
        "translation": "کافه روبه‌روی ایستگاه است.",
        "options": [
          "gegenüber dem",
          "gegenüber den",
          "gegenüber der",
          "gegenüber die"
        ],
        "correct": 0,
        "why": "gegenüber با داتیو می‌آید؛ der Bahnhof ← dem Bahnhof."
      },
      {
        "id": "d7",
        "prompt": "Nach ___ Essen gehen wir spazieren.",
        "translation": "بعد از غذا قدم می‌زنیم.",
        "options": [
          "dem",
          "den",
          "das",
          "der"
        ],
        "correct": 0,
        "why": "nach داتیو می‌خواهد؛ das Essen ← dem Essen."
      },
      {
        "id": "d8",
        "prompt": "Ich wohne ___ meinen Eltern.",
        "translation": "من پیش پدر و مادرم زندگی می‌کنم.",
        "options": [
          "bei",
          "mit",
          "von",
          "zu"
        ],
        "correct": 0,
        "why": "bei یعنی «نزدِ» کسی؛ جمع داتیو می‌شود meinen Eltern."
      }
    ]
  },
  {
    "id": "akkusativ",
    "number": 2,
    "title": "Präpositionen mit Akkusativ",
    "fa": "حروف اضافه با آکوزاتیو",
    "drills": [
      {
        "id": "a1",
        "prompt": "Das ist ein Geschenk ___ meinen Vater.",
        "translation": "این هدیه‌ای برای پدر من است.",
        "options": [
          "für mein",
          "für meinen",
          "für meinem",
          "für meiner"
        ],
        "correct": 1,
        "why": "für همیشه آکوزاتیو می‌گیرد؛ der Vater در آکوزاتیو می‌شود meinen Vater."
      },
      {
        "id": "a2",
        "prompt": "Wir laufen ___ den Wald.",
        "translation": "ما از میان جنگل عبور می‌کنیم.",
        "options": [
          "durch dem",
          "durch der",
          "durch den",
          "durch das"
        ],
        "correct": 2,
        "why": "der Wald مذکر است و در آکوزاتیو بعد از durch به den Wald تبدیل می‌شود."
      },
      {
        "id": "a3",
        "prompt": "Ich gehe ___ dich ins Kino.",
        "translation": "من بدون تو به سینما می‌روم.",
        "options": [
          "ohne",
          "für",
          "gegen",
          "um"
        ],
        "correct": 0,
        "why": "ohne همیشه آکوزاتیو می‌گیرد و معنی «بدون» دارد."
      },
      {
        "id": "a4",
        "prompt": "Wir sitzen ___ den Tisch.",
        "translation": "ما دور میز نشسته‌ایم.",
        "options": [
          "um",
          "für",
          "ohne",
          "bis"
        ],
        "correct": 0,
        "why": "um + آکوزاتیو یعنی «دورِ» چیزی."
      },
      {
        "id": "a5",
        "prompt": "Dieses Medikament hilft ___ Kopfschmerzen.",
        "translation": "این دارو علیه سردرد کمک می‌کند.",
        "options": [
          "gegen",
          "für",
          "durch",
          "ohne"
        ],
        "correct": 0,
        "why": "gegen + آکوزاتیو یعنی «علیه / در برابر». جمع Kopfschmerzen بدون تغییر می‌ماند."
      },
      {
        "id": "a6",
        "prompt": "Ich begleite dich ___ zur Tür.",
        "translation": "من تو را تا دم در همراهی می‌کنم.",
        "options": [
          "bis",
          "nach",
          "zu",
          "für"
        ],
        "correct": 0,
        "why": "bis zur Tür یعنی «تا دم در»؛ bis مرز مسیر را نشان می‌دهد."
      },
      {
        "id": "a7",
        "prompt": "___ wen ist dieses Geschenk?",
        "translation": "این هدیه برای چه کسی است؟",
        "options": [
          "Für",
          "Mit",
          "Bei",
          "Von"
        ],
        "correct": 0,
        "why": "برای پرسیدن دربارهٔ گیرندهٔ هدیه از für wen استفاده می‌کنیم."
      },
      {
        "id": "a8",
        "prompt": "Wir gehen ___ Fluss entlang.",
        "translation": "ما در امتداد رودخانه قدم می‌زنیم.",
        "options": [
          "den",
          "dem",
          "der",
          "das"
        ],
        "correct": 0,
        "why": "entlang بعد از اسم، آکوزاتیو می‌گیرد: den Fluss entlang."
      }
    ]
  },
  {
    "id": "wechsel",
    "number": 3,
    "title": "Wechselpräpositionen",
    "fa": "حروف اضافهٔ دوحالته",
    "drills": [
      {
        "id": "w1",
        "prompt": "Ich stelle die Lampe ___ Tisch.",
        "translation": "من چراغ را روی میز قرار می‌دهم.",
        "options": [
          "auf dem",
          "auf den",
          "auf der",
          "auf die"
        ],
        "correct": 1,
        "why": "stellen تغییر مکان به مقصد دارد؛ Wohin? پس آکوزاتیو: auf den Tisch."
      },
      {
        "id": "w2",
        "prompt": "Die Lampe steht ___ Tisch.",
        "translation": "چراغ روی میز قرار دارد.",
        "options": [
          "auf dem",
          "auf den",
          "auf der",
          "auf die"
        ],
        "correct": 0,
        "why": "stehen موقعیت ثابت است؛ Wo? پس داتیو: auf dem Tisch."
      },
      {
        "id": "w3",
        "prompt": "Wir gehen ___ Küche.",
        "translation": "ما به آشپزخانه می‌رویم.",
        "options": [
          "in der",
          "im",
          "in die",
          "in den"
        ],
        "correct": 2,
        "why": "حرکت به داخل مقصد است؛ in die Küche آکوزاتیو می‌گیرد."
      },
      {
        "id": "w4",
        "prompt": "Die Katze schläft ___ Sofa.",
        "translation": "گربه روی مبل خوابیده است.",
        "options": [
          "auf dem",
          "auf den",
          "auf der",
          "auf die"
        ],
        "correct": 0,
        "why": "schläft موقعیت ثابت است؛ das Sofa در داتیو می‌شود dem Sofa."
      },
      {
        "id": "w5",
        "prompt": "Ich hänge das Bild ___ Wand.",
        "translation": "من تصویر را به دیوار می‌آویزم.",
        "options": [
          "an die",
          "an der",
          "an dem",
          "an den"
        ],
        "correct": 0,
        "why": "hängen به معنی آویزان‌کردن حرکت است؛ die Wand در آکوزاتیو همان die می‌ماند."
      },
      {
        "id": "w6",
        "prompt": "Das Bild hängt ___ Wand.",
        "translation": "تصویر روی دیوار آویزان است.",
        "options": [
          "an der",
          "an die",
          "an dem",
          "an den"
        ],
        "correct": 0,
        "why": "hängt اینجا حالت ثابت است؛ die Wand در داتیو می‌شود der Wand."
      },
      {
        "id": "w7",
        "prompt": "Der Hund liegt ___ Tisch.",
        "translation": "سگ زیر میز خوابیده است.",
        "options": [
          "unter dem",
          "unter den",
          "unter der",
          "unter die"
        ],
        "correct": 0,
        "why": "liegen موقعیت ثابت است؛ der Tisch در داتیو می‌شود dem Tisch."
      },
      {
        "id": "w8",
        "prompt": "Wir stellen die Stühle ___ Tisch.",
        "translation": "ما صندلی‌ها را زیر میز می‌گذاریم.",
        "options": [
          "unter den",
          "unter dem",
          "unter der",
          "unter die"
        ],
        "correct": 0,
        "why": "stellen حرکت به مقصد است؛ جمع Stühle در آکوزاتیو den می‌گیرد."
      },
      {
        "id": "w9",
        "prompt": "Sie geht ___ Bibliothek.",
        "translation": "او به کتابخانه می‌رود.",
        "options": [
          "in die",
          "in der",
          "in dem",
          "in den"
        ],
        "correct": 0,
        "why": "gehen به سمت داخل است؛ die Bibliothek در آکوزاتیو die می‌ماند."
      }
    ]
  },
  {
    "id": "dativ-akkusativ",
    "number": 4,
    "title": "Dativ und Akkusativ",
    "fa": "تشخیص مفعول داتیو و آکوزاتیو",
    "drills": [
      {
        "id": "c1",
        "prompt": "Der Lehrer erklärt ___ Schüler die Regel.",
        "translation": "معلم قاعده را به دانش‌آموز توضیح می‌دهد.",
        "options": [
          "den",
          "dem",
          "der",
          "die"
        ],
        "correct": 1,
        "why": "دانش‌آموز گیرندهٔ توضیح است، پس داتیو: dem Schüler."
      },
      {
        "id": "c2",
        "prompt": "Ich schenke ___ Freundin ein Buch.",
        "translation": "من به دوستم کتاب هدیه می‌دهم.",
        "options": [
          "meiner",
          "meine",
          "meinen",
          "meinem"
        ],
        "correct": 0,
        "why": "Freundin مؤنث و در داتیو است؛ mein + Dativ fem = meiner."
      },
      {
        "id": "c3",
        "prompt": "Er hilft ___ Bruder.",
        "translation": "او به برادرش کمک می‌کند.",
        "options": [
          "seinem",
          "seinen",
          "seine",
          "seiner"
        ],
        "correct": 0,
        "why": "helfen داتیو می‌خواهد؛ der Bruder ← seinem Bruder."
      },
      {
        "id": "c4",
        "prompt": "Wir sehen ___ Lehrer.",
        "translation": "ما معلم را می‌بینیم.",
        "options": [
          "den",
          "dem",
          "der",
          "die"
        ],
        "correct": 0,
        "why": "sehen مفعول مستقیم می‌خواهد؛ der Lehrer در آکوزاتیو می‌شود den Lehrer."
      },
      {
        "id": "c5",
        "prompt": "Ich gebe ___ Kind den Ball.",
        "translation": "من توپ را به بچه می‌دهم.",
        "options": [
          "dem",
          "den",
          "der",
          "die"
        ],
        "correct": 0,
        "why": "کودک گیرندهٔ توپ است؛ das Kind در داتیو می‌شود dem Kind."
      },
      {
        "id": "c6",
        "prompt": "Kannst du ___ helfen?",
        "translation": "می‌توانی به من کمک کنی؟",
        "options": [
          "mir",
          "mich",
          "dir",
          "dich"
        ],
        "correct": 0,
        "why": "helfen داتیو می‌خواهد؛ ضمیر اول‌شخص داتیو mir است."
      },
      {
        "id": "c7",
        "prompt": "Ich liebe ___.",
        "translation": "من تو را دوست دارم.",
        "options": [
          "dich",
          "dir",
          "mir",
          "mich"
        ],
        "correct": 0,
        "why": "lieben مفعول مستقیم می‌خواهد؛ ضمیر دوم‌شخص آکوزاتیو dich است."
      },
      {
        "id": "c8",
        "prompt": "Das Geschenk ist für ___ Schwester.",
        "translation": "هدیه برای خواهر من است.",
        "options": [
          "meine",
          "meiner",
          "meinen",
          "meinem"
        ],
        "correct": 0,
        "why": "für آکوزاتیو می‌خواهد؛ die Schwester در آکوزاتیو meine Schwester می‌شود."
      },
      {
        "id": "c9",
        "prompt": "Er erklärt ___ Kindern die Aufgabe.",
        "translation": "او تکلیف را به بچه‌ها توضیح می‌دهد.",
        "options": [
          "den",
          "die",
          "der",
          "dem"
        ],
        "correct": 0,
        "why": "جمع در داتیو den می‌گیرد؛ Kindern خودش هم نشانهٔ جمع داتیو است."
      }
    ]
  },
  {
    "id": "nebensatz",
    "number": 5,
    "title": "Nebensätze",
    "fa": "جمله‌های فرعی",
    "drills": [
      {
        "id": "n1",
        "prompt": "Ich lerne Deutsch, weil ich in Berlin ___.",
        "translation": "من آلمانی یاد می‌گیرم چون در برلین زندگی می‌کنم.",
        "options": [
          "wohne",
          "ich wohne",
          "wohnen ich",
          "bin wohne"
        ],
        "correct": 0,
        "why": "در Nebensatz فعل صرف‌شده در پایان می‌آید: weil ich in Berlin wohne."
      },
      {
        "id": "n2",
        "prompt": "Ich weiß, dass er morgen ___.",
        "translation": "می‌دانم که او فردا می‌آید.",
        "options": [
          "kommt",
          "er kommt",
          "kommen er",
          "kommen"
        ],
        "correct": 0,
        "why": "dass جملهٔ فرعی می‌سازد و فعل صرف‌شده به انتها می‌رود."
      },
      {
        "id": "n3",
        "prompt": "___ ich krank war, blieb ich zu Hause.",
        "translation": "وقتی بیمار بودم، خانه ماندم.",
        "options": [
          "Als",
          "Wenn",
          "Wann",
          "Dass"
        ],
        "correct": 0,
        "why": "برای یک رویداد مشخص در گذشته از als استفاده می‌کنیم."
      },
      {
        "id": "n4",
        "prompt": "Ich rufe dich an, ___ ich ankomme.",
        "translation": "وقتی برسم به تو زنگ می‌زنم.",
        "options": [
          "wenn",
          "als",
          "dass",
          "weil"
        ],
        "correct": 0,
        "why": "برای شرط یا رویداد آینده از wenn استفاده می‌کنیم."
      },
      {
        "id": "n5",
        "prompt": "Obwohl es ___, gingen wir spazieren.",
        "translation": "با اینکه باران می‌بارید، قدم زدیم.",
        "options": [
          "regnete",
          "regnen",
          "es regnet",
          "regnen hat"
        ],
        "correct": 0,
        "why": "obwohl جملهٔ فرعی می‌سازد؛ فعل Präteritum به انتها می‌رود: es regnete."
      },
      {
        "id": "n6",
        "prompt": "Nachdem ich ___, ging ich schlafen.",
        "translation": "بعد از اینکه غذا خورده بودم، خوابیدم.",
        "options": [
          "gegessen hatte",
          "ich gegessen habe",
          "esse",
          "gegessen"
        ],
        "correct": 0,
        "why": "nachdem با Plusquamperfekt می‌آید: gegessen hatte."
      },
      {
        "id": "n7",
        "prompt": "Bevor du ___, ruf mich bitte an.",
        "translation": "قبل از اینکه بروی، لطفاً به من زنگ بزن.",
        "options": [
          "gehst",
          "du gehst",
          "gehen du",
          "gehen"
        ],
        "correct": 0,
        "why": "bevor جملهٔ فرعی است؛ فعل صرف‌شده در پایان: bevor du gehst."
      }
    ]
  },
  {
    "id": "modalverben",
    "number": 6,
    "title": "Modalverben",
    "fa": "افعال مُدال",
    "drills": [
      {
        "id": "m1",
        "prompt": "Wir ___ morgen früher aufstehen.",
        "translation": "ما باید فردا زودتر بیدار شویم.",
        "options": [
          "müssen",
          "können",
          "wollen",
          "müsst"
        ],
        "correct": 0,
        "why": "صرف‌شدهٔ müssen برای wir همان müssen است؛ مصدر aufstehen در پایان می‌آید."
      },
      {
        "id": "m2",
        "prompt": "___ du mir bitte helfen?",
        "translation": "می‌توانی لطفاً به من کمک کنی؟",
        "options": [
          "Kannst",
          "Kann",
          "Können",
          "Könnt"
        ],
        "correct": 0,
        "why": "برای du فعل können می‌شود kannst."
      },
      {
        "id": "m3",
        "prompt": "Hier ___ man nicht rauchen.",
        "translation": "اینجا اجازه ندارند سیگار بکشند.",
        "options": [
          "darf",
          "darfst",
          "dürfen",
          "musst"
        ],
        "correct": 0,
        "why": "man سوم‌شخص مفرد است؛ dürfen می‌شود darf."
      },
      {
        "id": "m4",
        "prompt": "Du ___ jetzt schlafen gehen.",
        "translation": "تو باید الان بروی بخوابی.",
        "options": [
          "sollst",
          "soll",
          "sollen",
          "sollt"
        ],
        "correct": 0,
        "why": "sollen برای du می‌شود sollst."
      },
      {
        "id": "m5",
        "prompt": "Wir ___ am Wochenende ins Kino gehen.",
        "translation": "ما می‌خواهیم آخر هفته به سینما برویم.",
        "options": [
          "wollen",
          "wollt",
          "will",
          "willst"
        ],
        "correct": 0,
        "why": "wollen برای wir بدون تغییر می‌ماند."
      },
      {
        "id": "m6",
        "prompt": "Ich ___ bitte einen Kaffee.",
        "translation": "لطفاً یک قهوه می‌خواهم.",
        "options": [
          "möchte",
          "möchtest",
          "möchten",
          "magst"
        ],
        "correct": 0,
        "why": "möchten برای ich می‌شود möchte؛ شکل مؤدبانهٔ درخواست."
      },
      {
        "id": "m7",
        "prompt": "Er ___ heute länger arbeiten.",
        "translation": "او امروز باید بیشتر کار کند.",
        "options": [
          "muss",
          "musst",
          "müssen",
          "möchtest"
        ],
        "correct": 0,
        "why": "müssen برای er می‌شود muss."
      },
      {
        "id": "m8",
        "prompt": "___ ihr morgen früh aufstehen?",
        "translation": "شما فردا زود بیدار می‌شوید؟",
        "options": [
          "Müsst",
          "Muss",
          "Müssen",
          "Müssten"
        ],
        "correct": 0,
        "why": "müssen برای ihr می‌شود müsst."
      }
    ]
  },
  {
    "id": "verben-praepositionen",
    "number": 7,
    "title": "Verben mit Präpositionen",
    "fa": "فعل همراه حرف اضافه",
    "drills": [
      {
        "id": "v1",
        "prompt": "Wir warten ___ den Zug.",
        "translation": "ما منتظر قطار هستیم.",
        "options": [
          "an",
          "für",
          "auf",
          "mit"
        ],
        "correct": 2,
        "why": "فعل warten حرف اضافهٔ ثابت auf دارد و مفعولش آکوزاتیو است."
      },
      {
        "id": "v2",
        "prompt": "Ich denke oft ___ meine Familie.",
        "translation": "من اغلب به خانواده‌ام فکر می‌کنم.",
        "options": [
          "an",
          "auf",
          "für",
          "über"
        ],
        "correct": 0,
        "why": "denken an + آکوزاتیو یعنی «فکر کردن به»."
      },
      {
        "id": "v3",
        "prompt": "Sie interessiert sich ___ Musik.",
        "translation": "او به موسیقی علاقه دارد.",
        "options": [
          "für",
          "an",
          "auf",
          "mit"
        ],
        "correct": 0,
        "why": "sich interessieren für + آکوزاتیو."
      },
      {
        "id": "v4",
        "prompt": "Wir freuen uns ___ den Urlaub.",
        "translation": "ما منتظر تعطیلات هستیم.",
        "options": [
          "auf",
          "für",
          "über",
          "an"
        ],
        "correct": 0,
        "why": "sich freuen auf برای رویداد آینده است."
      },
      {
        "id": "v5",
        "prompt": "Er hat Angst ___ Hunden.",
        "translation": "او از سگ‌ها می‌ترسد.",
        "options": [
          "vor",
          "von",
          "mit",
          "gegen"
        ],
        "correct": 0,
        "why": "Angst haben vor + داتیو؛ Hunden جمع داتیو است."
      },
      {
        "id": "v6",
        "prompt": "Ich spreche ___ meinem Chef.",
        "translation": "من با رئیس‌ام صحبت می‌کنم.",
        "options": [
          "mit",
          "zu",
          "bei",
          "für"
        ],
        "correct": 0,
        "why": "sprechen mit + داتیو؛ sprechen zu هم ممکن است اما اینجا mit رایج است."
      },
      {
        "id": "v7",
        "prompt": "Das hängt ___ Wetter ab.",
        "translation": "این به هوا بستگی دارد.",
        "options": [
          "vom",
          "beim",
          "zum",
          "im"
        ],
        "correct": 0,
        "why": "abhängen von + داتیو؛ von dem = vom."
      },
      {
        "id": "v8",
        "prompt": "Ich kümmere mich ___ die Kinder.",
        "translation": "من از بچه‌ها مراقبت می‌کنم.",
        "options": [
          "um",
          "für",
          "an",
          "auf"
        ],
        "correct": 0,
        "why": "sich kümmern um + آکوزاتیو."
      }
    ]
  },
  {
    "id": "zeiten",
    "number": 8,
    "title": "Zeiten",
    "fa": "زمان‌های مهم",
    "drills": [
      {
        "id": "t1",
        "prompt": "Gestern ___ ich lange ___.",
        "translation": "دیروز مدت زیادی درس خواندم.",
        "options": [
          "habe / gelernt",
          "bin / gelernt",
          "habe / lernen",
          "werde / gelernt"
        ],
        "correct": 0,
        "why": "Perfekt اینجا با haben + Partizip II ساخته می‌شود: habe gelernt."
      },
      {
        "id": "t2",
        "prompt": "Ich ___ nach Berlin gefahren.",
        "translation": "من به برلین رفتم.",
        "options": [
          "bin",
          "habe",
          "war",
          "werde"
        ],
        "correct": 0,
        "why": "fahren فعل حرکت است و Perfekt آن با sein ساخته می‌شود: bin gefahren."
      },
      {
        "id": "t3",
        "prompt": "Sie ___ das Buch gestern Abend.",
        "translation": "او دیشب کتاب را می‌خواند.",
        "options": [
          "las",
          "liest",
          "gelesen",
          "hat lesen"
        ],
        "correct": 0,
        "why": "Präteritum فعل lesen برای sie می‌شود las."
      },
      {
        "id": "t4",
        "prompt": "Morgen ___ wir dich besuchen.",
        "translation": "فردا به دیدنت می‌آییم.",
        "options": [
          "werden",
          "wurden",
          "sind",
          "haben"
        ],
        "correct": 0,
        "why": "Futur I = werden + مصدر؛ برای wir می‌شود werden."
      },
      {
        "id": "t5",
        "prompt": "Bevor wir ankamen, ___ ich schon gegessen.",
        "translation": "قبل از اینکه برسیم، من قبلاً غذا خورده بودم.",
        "options": [
          "hatte",
          "habe",
          "war",
          "werde"
        ],
        "correct": 0,
        "why": "Plusquamperfekt با hatte + Partizip II: hatte gegessen."
      },
      {
        "id": "t6",
        "prompt": "Er ___ gestern nicht zur Arbeit.",
        "translation": "او دیروز سر کار نرفت.",
        "options": [
          "ging",
          "geht",
          "gegangen",
          "ist gehen"
        ],
        "correct": 0,
        "why": "Präteritum فعل gehen برای er می‌شود ging."
      },
      {
        "id": "t7",
        "prompt": "Ich ___ das Buch schon gelesen.",
        "translation": "من کتاب را قبلاً خوانده‌ام.",
        "options": [
          "habe",
          "bin",
          "war",
          "werde"
        ],
        "correct": 0,
        "why": "Perfekt فعل lesen با haben ساخته می‌شود: habe gelesen."
      },
      {
        "id": "t8",
        "prompt": "Während ich ___, klingelte das Telefon.",
        "translation": "وقتی مشغول خواندن بودم، تلفن زنگ زد.",
        "options": [
          "las",
          "lese",
          "gelesen",
          "habe lesen"
        ],
        "correct": 0,
        "why": "روایت گذشته با Präteritum: während ich las."
      }
    ]
  },
  {
    "id": "relativsatz",
    "number": 9,
    "title": "Relativsätze",
    "fa": "جمله‌های موصولی",
    "drills": [
      {
        "id": "r1",
        "prompt": "Das ist der Mann, ___ ich gestern gesehen habe.",
        "translation": "این همان مردی است که دیروز دیدم.",
        "options": [
          "der",
          "dem",
          "den",
          "dessen"
        ],
        "correct": 2,
        "why": "ضمیر در جملهٔ موصولی مفعول مستقیم است؛ der Mann ← den."
      },
      {
        "id": "r2",
        "prompt": "Das ist die Frau, ___ Mann Arzt ist.",
        "translation": "این همان زنی است که شوهرش پزشک است.",
        "options": [
          "deren",
          "der",
          "die",
          "denen"
        ],
        "correct": 0,
        "why": "مالکیت برای مؤنث در جملهٔ موصولی با deren بیان می‌شود."
      },
      {
        "id": "r3",
        "prompt": "Der Film, ___ wir gesehen haben, war gut.",
        "translation": "فیلمی که دیدیم خوب بود.",
        "options": [
          "den",
          "der",
          "dem",
          "die"
        ],
        "correct": 0,
        "why": "Film مذکر و مفعول مستقیم است: den wir gesehen haben."
      },
      {
        "id": "r4",
        "prompt": "Das Haus, ___ wir wohnen, ist alt.",
        "translation": "خانه‌ای که در آن زندگی می‌کنیم قدیمی است.",
        "options": [
          "in dem",
          "in den",
          "in der",
          "in die"
        ],
        "correct": 0,
        "why": "wohnen in + داتیو؛ das Haus ← in dem."
      },
      {
        "id": "r5",
        "prompt": "Die Kinder, ___ ich geholfen habe, waren sehr dankbar.",
        "translation": "بچه‌هایی که به آن‌ها کمک کردم خیلی سپاسگزار بودند.",
        "options": [
          "denen",
          "die",
          "den",
          "dessen"
        ],
        "correct": 0,
        "why": "helfen داتیو می‌خواهد؛ جمع داتیو ضمیر موصولی denen است."
      },
      {
        "id": "r6",
        "prompt": "Der Mann, ___ ich das Buch gegeben habe, heißt Peter.",
        "translation": "مردی که کتاب را به او دادم پیتر نام دارد.",
        "options": [
          "dem",
          "den",
          "der",
          "die"
        ],
        "correct": 0,
        "why": "geben شخص را داتیو می‌گیرد؛ der Mann ← dem."
      },
      {
        "id": "r7",
        "prompt": "Das ist das Buch, ___ ich dir empfohlen habe.",
        "translation": "این همان کتابی است که به تو پیشنهاد دادم.",
        "options": [
          "das",
          "dem",
          "den",
          "der"
        ],
        "correct": 0,
        "why": "Buch خنثی و مفعول مستقیم است؛ در آکوزاتیو das می‌ماند."
      }
    ]
  },
  {
    "id": "adjektive",
    "number": 10,
    "title": "Adjektive und Deklination",
    "fa": "صفت‌ها و صرف آن‌ها",
    "drills": [
      {
        "id": "ad1",
        "prompt": "Ich habe einen ___ Freund.",
        "translation": "من یک دوست خوب دارم.",
        "options": [
          "gute",
          "guten",
          "gutem",
          "guter"
        ],
        "correct": 1,
        "why": "einen حالت آکوزاتیو مذکر است؛ صفت بعد از آن پایان -en می‌گیرد."
      },
      {
        "id": "ad2",
        "prompt": "Das ist ein ___ Haus.",
        "translation": "این خانهٔ قشنگی است.",
        "options": [
          "schönes",
          "schöne",
          "schönen",
          "schönem"
        ],
        "correct": 0,
        "why": "ein + خنثی در حالت فاعلی؛ صفت schönes می‌شود."
      },
      {
        "id": "ad3",
        "prompt": "Ich wohne in einer ___ Wohnung.",
        "translation": "من در آپارتمان کوچکی زندگی می‌کنم.",
        "options": [
          "kleinen",
          "kleine",
          "kleiner",
          "kleines"
        ],
        "correct": 0,
        "why": "in + داتیو مؤنث؛ بعد از einer صفت پایان -en می‌گیرد."
      },
      {
        "id": "ad4",
        "prompt": "Das ist der ___ Weg.",
        "translation": "این بهترین راه است.",
        "options": [
          "beste",
          "besten",
          "bester",
          "bestem"
        ],
        "correct": 0,
        "why": "der + مذکر فاعلی؛ صفت عالی beste می‌شود."
      },
      {
        "id": "ad5",
        "prompt": "Mit dem ___ Auto fahre ich zur Arbeit.",
        "translation": "با ماشین جدید به سر کار می‌روم.",
        "options": [
          "neuen",
          "neue",
          "neuer",
          "neues"
        ],
        "correct": 0,
        "why": "mit + داتیو خنثی؛ بعد از dem صفت neuen می‌شود."
      },
      {
        "id": "ad6",
        "prompt": "Sie ist zwei Jahre ___ als ich.",
        "translation": "او دو سال از من بزرگ‌تر است.",
        "options": [
          "älter",
          "alt",
          "älteste",
          "am ältesten"
        ],
        "correct": 0,
        "why": "مقایسه با als صفت تفضیلی می‌خواهد: älter als ich."
      },
      {
        "id": "ad7",
        "prompt": "Das ist das ___ Buch, das ich kenne.",
        "translation": "این جالب‌ترین کتابی است که می‌شناسم.",
        "options": [
          "interessanteste",
          "interessante",
          "interessanter",
          "interessantesten"
        ],
        "correct": 0,
        "why": "das + خنثی فاعلی و صفت عالی: interessanteste."
      },
      {
        "id": "ad8",
        "prompt": "Ein ___ Freund hilft immer.",
        "translation": "یک دوست خوب همیشه کمک می‌کند.",
        "options": [
          "guter",
          "guten",
          "gute",
          "gutem"
        ],
        "correct": 0,
        "why": "ein + مذکر فاعلی؛ صفت پایان -er می‌گیرد: ein guter Freund."
      }
    ]
  },
  {
    "id": "passiv",
    "number": 11,
    "title": "Passiv und Konjunktiv II",
    "fa": "مجهول و حالت فرضی",
    "drills": [
      {
        "id": "p1",
        "prompt": "Wenn ich mehr Zeit ___, ___ ich jeden Tag lernen.",
        "translation": "اگر وقت بیشتری داشتم، هر روز درس می‌خواندم.",
        "options": [
          "habe / werde",
          "hätte / würde",
          "hatte / werde",
          "wäre / habe"
        ],
        "correct": 1,
        "why": "شرط غیرواقعی در زمان حال با hätte و würde ساخته می‌شود."
      },
      {
        "id": "p2",
        "prompt": "Das Haus ___ 1990 gebaut.",
        "translation": "خانه در سال ۱۹۹۰ ساخته شد.",
        "options": [
          "wurde",
          "werden",
          "ist",
          "hat"
        ],
        "correct": 0,
        "why": "Passiv گذشته = wurde + Partizip II."
      },
      {
        "id": "p3",
        "prompt": "Die Briefe ___ morgen verschickt.",
        "translation": "نامه‌ها فردا فرستاده می‌شوند.",
        "options": [
          "werden",
          "wurde",
          "wird",
          "sind"
        ],
        "correct": 0,
        "why": "جمع Briefe با werden در Passiv Präsens می‌آید."
      },
      {
        "id": "p4",
        "prompt": "Wenn ich reich ___, würde ich um die Welt reisen.",
        "translation": "اگر ثروتمند بودم، دور دنیا سفر می‌کردم.",
        "options": [
          "wäre",
          "bin",
          "war",
          "werde"
        ],
        "correct": 0,
        "why": "Konjunktiv II فعل sein برای ich می‌شود wäre."
      },
      {
        "id": "p5",
        "prompt": "Ich ___ dir gerne helfen, aber ich habe keine Zeit.",
        "translation": "دوست داشتم به تو کمک کنم، اما وقت ندارم.",
        "options": [
          "würde",
          "werde",
          "wurde",
          "bin"
        ],
        "correct": 0,
        "why": "Konjunktiv II با würde + مصدر helfen ساخته می‌شود."
      },
      {
        "id": "p6",
        "prompt": "Es ___ schön, wenn du morgen kommst.",
        "translation": "اگر فردا بیایی عالی می‌شد.",
        "options": [
          "wäre",
          "ist",
          "war",
          "wird"
        ],
        "correct": 0,
        "why": "برای فرض مؤدبانه از wäre استفاده می‌کنیم."
      },
      {
        "id": "p7",
        "prompt": "Das Problem ___ heute gelöst werden.",
        "translation": "مشکل باید امروز حل شود.",
        "options": [
          "muss",
          "musst",
          "müssen",
          "möchtest"
        ],
        "correct": 0,
        "why": "Passiv با فعل مُدال: muss + Partizip II + werden."
      },
      {
        "id": "p8",
        "prompt": "Könntest du mir bitte ___?",
        "translation": "می‌توانی لطفاً به من کمک کنی؟",
        "options": [
          "helfen",
          "hilfst",
          "geholfen",
          "halfst"
        ],
        "correct": 0,
        "why": "بعد از فعل مُدال، فعل اصلی مصدر می‌ماند."
      }
    ]
  },
  {
    "id": "schreiben",
    "number": 12,
    "title": "Schreiben und Prüfung B1",
    "fa": "نوشتن و آمادگی آزمون B1",
    "drills": [
      {
        "id": "s1",
        "prompt": "___ Meinung nach ist tägliches Schreiben sehr wichtig.",
        "translation": "به نظر من نوشتن روزانه خیلی مهم است.",
        "options": [
          "Meiner",
          "Meinem",
          "Meine",
          "Meinen"
        ],
        "correct": 0,
        "why": "عبارت ثابت: Meiner Meinung nach …"
      },
      {
        "id": "s2",
        "prompt": "Ich freue mich ___ den Ausflug nächste Woche.",
        "translation": "من منتظر سفر هفتهٔ آینده‌ام.",
        "options": [
          "auf",
          "für",
          "über",
          "an"
        ],
        "correct": 0,
        "why": "sich freuen auf برای رویداد آینده است."
      },
      {
        "id": "s3",
        "prompt": "___ ich die Prüfung bestehe, mache ich Urlaub.",
        "translation": "اگر امتحان را قبول شوم، به تعطیلات می‌روم.",
        "options": [
          "Wenn",
          "Dass",
          "Weil",
          "Ob"
        ],
        "correct": 0,
        "why": "شرط با wenn ساخته می‌شود؛ فعل جملهٔ فرعی به انتها می‌رود."
      },
      {
        "id": "s4",
        "prompt": "Könnten Sie mir bitte ___, wann der Kurs beginnt?",
        "translation": "می‌توانید لطفاً به من بگویید دوره کی شروع می‌شود؟",
        "options": [
          "mitteilen",
          "mitteile",
          "mitzuteilen",
          "mitgeteilt"
        ],
        "correct": 0,
        "why": "بعد از فعل مُدال، فعل اصلی مصدر می‌ماند: mitteilen."
      },
      {
        "id": "s5",
        "prompt": "Ich möchte mich ___ die Verspätung entschuldigen.",
        "translation": "می‌خواهم برای تأخیر عذرخواهی کنم.",
        "options": [
          "für",
          "über",
          "an",
          "auf"
        ],
        "correct": 0,
        "why": "sich entschuldigen für + آکوزاتیو."
      },
      {
        "id": "s6",
        "prompt": "Mit freundlichen ___",
        "translation": "با احترام (پایان نامهٔ رسمی)",
        "options": [
          "Grüßen",
          "Grüße",
          "Gruß",
          "Grüß"
        ],
        "correct": 0,
        "why": "پایان ثابت نامهٔ رسمی: Mit freundlichen Grüßen."
      },
      {
        "id": "s7",
        "prompt": "Sehr geehrte ___ Frau Müller,",
        "translation": "خانم مولر محترم،",
        "options": [
          "geehrte",
          "geehrter",
          "geehrten",
          "geehrtem"
        ],
        "correct": 0,
        "why": "Sehr geehrte + Frau (مؤنث): geehrte."
      },
      {
        "id": "s8",
        "prompt": "Ich lerne jeden Tag Deutsch, ___ ich die B1-Prüfung bestehen will.",
        "translation": "من هر روز آلمانی می‌خوانم چون می‌خواهم امتحان B1 را قبول شوم.",
        "options": [
          "weil",
          "dass",
          "ob",
          "wann"
        ],
        "correct": 0,
        "why": "دلیل را با weil بیان می‌کنیم؛ فعل به انتهای جملهٔ فرعی می‌رود."
      }
    ]
  }
];

export const germanB1DrillTotal = germanB1DrillModules.reduce((total, module) => total + module.drills.length, 0);
