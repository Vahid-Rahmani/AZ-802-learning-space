/** Authored, bounded German exercises. This is not an unrestricted grammar checker. */
export type GrammarSkill = "meaning" | "auxiliary" | "participle" | "subordinate" | "inversion" | "transfer";
export type GrammarPrompt = {
  id: string; situation: string; goal: string; condition: string; consequence: string;
  cues: string; variants: string[]; skill: GrammarSkill;
};
export type GrammarMission = { id: string; chapter: number; title: string; icon: string; skill: GrammarSkill; main: GrammarPrompt; transfer: GrammarPrompt };
export const grammarSkills: Record<GrammarSkill, string> = {
  meaning: "معنای خلاف واقع در گذشته", auxiliary: "انتخاب hätte / wäre", participle: "Partizip II",
  subordinate: "جایگاه فعل بعد از wenn", inversion: "جایگاه فعل جملهٔ اصلی", transfer: "کاربرد در موقعیت تازه",
};
export const grammarChapters = [
  { id: 1, title: "ردّ اتفاقی که نیفتاد", subtitle: "کشف معنا و ساختار", description: "با موقعیت‌های کوتاه، گذشتهٔ واقعی را از گذشتهٔ فرضی جدا کن." },
  { id: 2, title: "کارگاه تعمیر جمله", subtitle: "بساز، بررسی کن، اصلاح کن", description: "خودت جمله بساز؛ سرنخ فقط وقتی لازم شد همراهت است." },
  { id: 3, title: "پرونده‌های تازه", subtitle: "کمک کمتر، کاربرد بیشتر", description: "ساختار آشنا را به سفر، کار، سلامتی و فناوری منتقل کن." },
  { id: 4, title: "کارآگاه مستقل", subtitle: "انتقال و ترکیب مهارت‌ها", description: "از معنا شروع کن؛ اسکلت جمله دیگر از قبل نمایش داده نمی‌شود." },
] as const;

function prompt(id: string, situation: string, goal: string, condition: string, consequence: string, cues: string, skill: GrammarSkill, variants: string[] = []): GrammarPrompt {
  return { id, situation, goal, condition, consequence, cues, skill, variants };
}
type Row = [string, string, string, string, string];
const rows: { title: string; icon: string; skill: GrammarSkill; main: Row; next: Row }[] = [
  { title: "قطار ازدست‌رفته", icon: "train", skill: "meaning",
    main: ["دیروز دیر راه افتادم و به قطار نرسیدم.", "بگو اگر زودتر راه افتاده بودم، به قطار می‌رسیدم.", "ich früher losgefahren wäre", "hätte ich den Zug erreicht", "losfahren · erreichen"],
    next: ["امروز صبح دیر بیدار شدم و اتوبوس را از دست دادم.", "زودتر بیدارشدن و رسیدن به اتوبوس را خلاف واقع بیان کن.", "ich früher aufgestanden wäre", "hätte ich den Bus erreicht", "aufstehen · erreichen"] },
  { title: "قرار فراموش‌شده", icon: "calendar", skill: "auxiliary",
    main: ["قرار دیروز را فراموش کردم؛ به‌موقع نرسیدم.", "یادداشت‌کردن قرار را شرط رسیدن به‌موقع قرار بده.", "ich den Termin notiert hätte", "wäre ich pünktlich angekommen", "notieren · ankommen"],
    next: ["نشانی محل را ذخیره نکردم و خانهٔ دوستم را پیدا نکردم.", "بگو با ذخیره‌کردن نشانی، خانه را پیدا می‌کردم.", "ich die Adresse gespeichert hätte", "hätte ich das Haus gefunden", "speichern · finden"] },
  { title: "کلید پشت در", icon: "key", skill: "participle",
    main: ["کلید را همراه نبردم و نتوانستم در را باز کنم.", "همراه‌داشتن کلید را به بازکردن در پیوند بده.", "ich den Schlüssel mitgenommen hätte", "hätte ich die Tür geöffnet", "mitnehmen · öffnen"],
    next: ["کیفم را بررسی نکردم؛ کارت ورود را پیدا نکردم.", "بررسی کیف و پیداکردن کارت را خلاف واقع بنویس.", "ich meine Tasche kontrolliert hätte", "hätte ich die Karte gefunden", "kontrollieren · finden"] },
  { title: "یک چتر کافی بود", icon: "cloud", skill: "subordinate",
    main: ["دیروز بدون چتر بیرون رفتم و خیس شدم.", "بگو با بردن چتر، خشک می‌ماندم.", "ich einen Regenschirm mitgenommen hätte", "wäre ich trocken geblieben", "mitnehmen · bleiben"],
    next: ["هوا را بررسی نکردم و لباس مناسب نپوشیدم.", "بررسی هوا و پوشیدن لباس مناسب را به هم مرتبط کن.", "ich das Wetter geprüft hätte", "hätte ich passende Kleidung angezogen", "prüfen · anziehen"] },
  { title: "پیام نخوانده", icon: "mail", skill: "inversion",
    main: ["پیام همکارم را نخواندم و جلسه را فراموش کردم.", "بگو خواندن پیام باعث یادداشت‌کردن جلسه می‌شد.", "ich die Nachricht gelesen hätte", "hätte ich die Besprechung notiert", "lesen · notieren"],
    next: ["به تقویم نگاه نکردم و تماس مهم را از دست دادم.", "بررسی تقویم و به‌موقع تماس‌گرفتن را خلاف واقع بیان کن.", "ich den Kalender geprüft hätte", "hätte ich rechtzeitig angerufen", "prüfen · anrufen"] },
  { title: "رزرو دیرهنگام", icon: "ticket", skill: "meaning",
    main: ["برای سفر هفتهٔ قبل دیر رزرو کردم و پول بیشتری دادم.", "بگو با رزرو زودتر، پول پس‌انداز می‌کردم.", "ich früher gebucht hätte", "hätte ich Geld gespart", "buchen · sparen"],
    next: ["بلیط را دیر خریدم و صندلی خوبی نگرفتم.", "خرید زودتر و گرفتن صندلی بهتر را بیان کن.", "ich das Ticket früher gekauft hätte", "hätte ich einen besseren Platz bekommen", "kaufen · bekommen"] },
  { title: "گزارش بدون نسخهٔ پشتیبان", icon: "file", skill: "auxiliary",
    main: ["فایل گزارش پاک شد؛ نسخهٔ پشتیبان نگرفته بودم.", "بگو اگر فایل را ذخیره کرده بودم، داده‌ها را حفظ می‌کردم.", "ich die Datei gespeichert hätte", "hätte ich die Daten behalten", "speichern · behalten"],
    next: ["باتری تمام شد و تغییرات را از دست دادم.", "شارژکردن لپ‌تاپ و ذخیره‌کردن گزارش را پیوند بده.", "ich den Laptop geladen hätte", "hätte ich den Bericht gespeichert", "laden · speichern"] },
  { title: "مسیر اشتباه", icon: "map", skill: "subordinate",
    main: ["مسیر را بررسی نکردم و خیلی دیر رسیدم.", "اگر مسیر را بررسی کرده بودم، زودتر می‌رسیدم.", "ich die Route geprüft hätte", "wäre ich früher angekommen", "prüfen · ankommen"],
    next: ["به چپ نپیچیدم و ایستگاه را پیدا نکردم.", "پیچیدن به چپ و یافتن ایستگاه را بیان کن.", "ich links abgebogen wäre", "hätte ich den Bahnhof gefunden", "abbiegen · finden"] },
  { title: "توضیحی که نپرسیدم", icon: "chat", skill: "inversion",
    main: ["در کلاس سؤال نپرسیدم و تکلیف را نفهمیدم.", "پرسیدن از معلم و فهمیدن تکلیف را خلاف واقع بیان کن.", "ich die Lehrerin gefragt hätte", "hätte ich die Aufgabe verstanden", "fragen · verstehen"],
    next: ["توضیح همکار را نشنیدم و اشتباه کردم.", "گوش‌دادن دقیق و جلوگیری از اشتباه را پیوند بده.", "ich genauer zugehört hätte", "hätte ich den Fehler vermieden", "zuhören · vermeiden"] },
  { title: "فایل اشتباه در پیوست", icon: "mail", skill: "participle",
    main: ["پیوست ایمیل را بررسی نکردم و نسخهٔ قدیمی را فرستادم.", "بررسی پیوست و فرستادن نسخهٔ درست را بیان کن.", "ich den Anhang geprüft hätte", "hätte ich die richtige Version geschickt", "prüfen · schicken"],
    next: ["قبل از ارسال، متن را نخواندم و اشتباه باقی ماند.", "بازخوانی متن و اصلاح اشتباه را بیان کن.", "ich den Text gelesen hätte", "hätte ich den Fehler korrigiert", "lesen · korrigieren"] },
  { title: "آزمون آماده‌نشده", icon: "book", skill: "auxiliary",
    main: ["برای آزمون دیروز کم تمرین کردم و قبول نشدم.", "بگو با تمرین بیشتر، آزمون را قبول می‌شدم.", "ich mehr geübt hätte", "hätte ich die Prüfung bestanden", "üben · bestehen"],
    next: ["واژه‌ها را تکرار نکردم و متن را نفهمیدم.", "تکرار واژه‌ها و فهمیدن متن را بیان کن.", "ich die Wörter wiederholt hätte", "hätte ich den Text verstanden", "wiederholen · verstehen"] },
  { title: "پرواز ازدست‌رفته", icon: "plane", skill: "subordinate",
    main: ["دیر به فرودگاه رفتم و به پرواز نرسیدم.", "رفتن زودتر و رسیدن به پرواز را بیان کن.", "ich früher zum Flughafen gefahren wäre", "hätte ich den Flug erreicht", "fahren · erreichen"],
    next: ["گذرنامه را همراه نبردم و به برلین سفر نکردم.", "بردن گذرنامه و سفر به برلین را بیان کن.", "ich den Reisepass mitgenommen hätte", "wäre ich nach Berlin gereist", "mitnehmen · reisen"] },
  { title: "جلسهٔ آنلاین", icon: "screen", skill: "transfer",
    main: ["اتصال را قبل از جلسه بررسی نکردم و به‌موقع شرکت نکردم.", "بررسی اتصال و شرکت به‌موقع را بیان کن.", "ich die Verbindung geprüft hätte", "hätte ich pünktlich teilgenommen", "Verbindung · prüfen · teilnehmen"],
    next: ["میکروفن را آزمایش نکردم و مشکل را دیر کشف کردم.", "آزمایش میکروفن و زودتر پیداکردن مشکل را بیان کن.", "ich das Mikrofon getestet hätte", "hätte ich das Problem früher gefunden", "Mikrofon · testen · finden"] },
  { title: "استراحت عقب‌افتاده", icon: "moon", skill: "auxiliary",
    main: ["دیشب دیر خوابیدم و امروز خسته بودم.", "بگو با زودتر خوابیدن، سرحال می‌ماندم.", "ich früher geschlafen hätte", "wäre ich fit geblieben", "schlafen · bleiben"],
    next: ["در پیاده‌روی آب نبردم و تشنه ماندم.", "همراه‌بردن آب و نوشیدن کافی را پیوند بده.", "ich Wasser mitgenommen hätte", "hätte ich genug getrunken", "mitnehmen · trinken"] },
  { title: "دستور پخت نخوانده", icon: "cup", skill: "participle",
    main: ["دستور پخت را نخواندم و غذا سوخت.", "خواندن دستور و تنظیم درست فر را بیان کن.", "ich das Rezept gelesen hätte", "hätte ich den Ofen richtig eingestellt", "Rezept · lesen · einstellen"],
    next: ["مواد را وزن نکردم و کیک خوب نشد.", "وزن‌کردن مواد و پختن کیک بهتر را بیان کن.", "ich die Zutaten gewogen hätte", "hätte ich einen besseren Kuchen gebacken", "Zutaten · wiegen · backen"] },
  { title: "تغییر بدون آزمایش", icon: "server", skill: "inversion",
    main: ["تغییر را آزمایش نکردم و خطای برنامه باقی ماند.", "آزمایش تغییر و پیداکردن خطا را بیان کن.", "ich die Änderung getestet hätte", "hätte ich den Fehler gefunden", "Änderung · testen · finden"],
    next: ["به‌روزرسانی را نصب نکردم و مشکل ادامه پیدا کرد.", "نصب به‌روزرسانی و حل مشکل را بیان کن.", "ich das Update installiert hätte", "hätte ich das Problem gelöst", "Update · installieren · lösen"] },
  { title: "خانهٔ بی‌گرما", icon: "home", skill: "subordinate",
    main: ["پنجره را نبستم و اتاق سرد شد.", "بستن پنجره و گرم‌ماندن اتاق را بیان کن.", "ich das Fenster geschlossen hätte", "wäre das Zimmer warm geblieben", "Fenster · schließen · bleiben"],
    next: ["گرمایش را روشن نکردم و آب سرد ماند.", "روشن‌کردن گرمایش و گرم‌شدن آب را بیان کن.", "ich die Heizung eingeschaltet hätte", "wäre das Wasser warm geworden", "Heizung · einschalten · werden"] },
  { title: "تصمیم شغلی", icon: "case", skill: "meaning",
    main: ["درخواست شغل را دیر فرستادم و دعوت نشدم.", "فرستادن زودتر درخواست و دعوت به مصاحبه را بیان کن.", "ich die Bewerbung früher geschickt hätte", "hätte ich eine Einladung bekommen", "Bewerbung · schicken · bekommen"],
    next: ["برای مصاحبه آماده نشدم و اعتمادبه‌نفس نداشتم.", "آماده‌شدن بهتر و آرام‌تر ماندن را بیان کن.", "ich mich besser vorbereitet hätte", "wäre ich ruhiger geblieben", "sich vorbereiten · bleiben"] },
  { title: "مدرک جامانده", icon: "file", skill: "transfer",
    main: ["مدرک لازم را نبردم و پروندهٔ اداری تکمیل نشد.", "بردن مدرک و تحویل درخواست را بیان کن.", "ich das Dokument mitgebracht hätte", "hätte ich den Antrag abgegeben", "Dokument · Antrag"],
    next: ["فرم را امضا نکردم و درخواست پذیرفته نشد.", "امضاکردن فرم و دریافت تأیید را بیان کن.", "ich das Formular unterschrieben hätte", "hätte ich eine Bestätigung bekommen", "Formular · Bestätigung"] },
  { title: "کپی روی دستگاه خراب", icon: "server", skill: "transfer",
    main: ["نسخهٔ پشتیبان را بررسی نکردم و داده‌ها بازیابی نشدند.", "بررسی نسخهٔ پشتیبان و بازیابی داده‌ها را بیان کن.", "ich das Backup geprüft hätte", "hätte ich die Daten wiederhergestellt", "Backup · Daten"],
    next: ["رمز را امن نگه نداشتم و حسابم به خطر افتاد.", "تغییر زودتر رمز و حفاظت حساب را بیان کن.", "ich das Passwort früher geändert hätte", "hätte ich das Konto geschützt", "Passwort · Konto"] },
  { title: "بازدید ناموفق", icon: "map", skill: "transfer",
    main: ["ساعت بازشدن موزه را نخواندم و وارد نشدم.", "خواندن ساعت‌ها و زودتر رسیدن را بیان کن.", "ich die Öffnungszeiten gelesen hätte", "wäre ich früher angekommen", "Öffnungszeiten · ankommen"],
    next: ["برای نمایش بلیط نگرفتم و به تئاتر نرفتم.", "خرید بلیط و رفتن به تئاتر را بیان کن.", "ich eine Karte gekauft hätte", "wäre ich ins Theater gegangen", "Karte · Theater"] },
  { title: "تحویل پروژه", icon: "case", skill: "transfer",
    main: ["کارها را تقسیم نکردیم و پروژه دیر تمام شد.", "بگو با تقسیم وظایف، زودتر تمام می‌کردیم.", "wir die Aufgaben verteilt hätten", "hätten wir das Projekt früher abgeschlossen", "Aufgaben · Projekt"],
    next: ["با مشتری تماس نگرفتیم و نیازها روشن نشد.", "تماس با مشتری و فهمیدن نیازها را بیان کن.", "wir den Kunden angerufen hätten", "hätten wir die Anforderungen verstanden", "Kunden · Anforderungen"] },
  { title: "سفر گروهی", icon: "train", skill: "transfer",
    main: ["دوستانم دیر راه افتادند و به کشتی نرسیدند.", "بگو با حرکت زودتر، به کشتی می‌رسیدند.", "sie früher losgefahren wären", "hätten sie das Schiff erreicht", "sie · Schiff"],
    next: ["ما هتل را دیر رزرو کردیم و اتاق نگرفتیم.", "رزرو زودتر و گرفتن اتاق را بیان کن.", "wir früher gebucht hätten", "hätten wir ein Zimmer bekommen", "wir · Zimmer"] },
  { title: "آخرین شاهد", icon: "key", skill: "transfer",
    main: ["او به نشانه‌ها توجه نکرد و راه‌حل را پیدا نکرد.", "بگو اگر او نشانه‌ها را خوانده بود، معما را حل می‌کرد.", "er die Hinweise gelesen hätte", "hätte er das Rätsel gelöst", "er · Hinweise · Rätsel"],
    next: ["تیم ما تجربهٔ قبلی را ثبت نکرد و همان اشتباه تکرار شد.", "ثبت تجربه و اجتناب از اشتباه را بیان کن.", "wir die Erfahrung dokumentiert hätten", "hätten wir den Fehler vermieden", "wir · Erfahrung · Fehler"] },
];
const authoredAlternatives: Record<string, string[]> = {
  "01-main": ["Wenn ich früher losgefahren wäre, hätte ich meinen Zug erreicht.", "Ich hätte den Zug erreicht, wenn ich eher losgefahren wäre."],
  "01-transfer": ["Wenn ich eher aufgestanden wäre, hätte ich den Bus erreicht."],
  "02-main": ["Wenn ich mir den Termin notiert hätte, wäre ich pünktlich angekommen."],
  "03-main": ["Wenn ich meinen Schlüssel mitgenommen hätte, hätte ich die Tür geöffnet."],
  "06-main": ["Wenn ich eher gebucht hätte, hätte ich Geld gespart."],
  "07-main": ["Wenn ich die Datei gesichert hätte, hätte ich die Daten behalten."],
  "08-main": ["Wenn ich die Route überprüft hätte, wäre ich früher angekommen."],
  "10-main": ["Wenn ich den Anhang überprüft hätte, hätte ich die richtige Version geschickt."],
  "11-main": ["Wenn ich mehr gelernt hätte, hätte ich die Prüfung bestanden."],
  "16-main": ["Wenn ich die Änderung geprüft hätte, hätte ich den Fehler gefunden."],
  "20-main": ["Wenn ich das Backup überprüft hätte, hätte ich die Daten wiederhergestellt."],
};
export const grammarMissions: GrammarMission[] = rows.map((r, i) => {
  const id = String(i + 1).padStart(2, "0");
  return { id, chapter: Math.floor(i / 6) + 1, title: r.title, icon: r.icon, skill: r.skill,
    main: prompt(`${id}-main`, ...r.main, r.skill, authoredAlternatives[`${id}-main`] ?? []), transfer: prompt(`${id}-transfer`, ...r.next, r.skill, authoredAlternatives[`${id}-transfer`] ?? []) };
});
// New contexts are held out of the learning missions; no models are shown during the final test.
export const grammarFinal: GrammarPrompt[] = [
  prompt("final-1", "دوچرخه را تعمیر نکردم و با آن به محل کار نرفتم.", "تعمیر دوچرخه و رفتن به محل کار را خلاف واقع بیان کن.", "ich das Fahrrad repariert hätte", "wäre ich zur Arbeit gefahren", "Fahrrad · reparieren · fahren", "auxiliary"),
  prompt("final-2", "او نام مشتری را ننوشته بود و مشتری را فراموش کرد.", "یادداشت نام و به‌یادآوردن مشتری را بیان کن.", "sie den Namen notiert hätte", "hätte sie sich an den Kunden erinnert", "sie · notieren · sich erinnern", "participle"),
  prompt("final-3", "به خبر تعطیلی بانک گوش ندادیم و به بانک رفتیم.", "شنیدن خبر و خانه‌ماندن را بیان کن.", "wir die Nachricht gehört hätten", "wären wir zu Hause geblieben", "wir · hören · bleiben", "subordinate"),
  prompt("final-4", "دربارهٔ هزینه نپرسیدند و بیش از حد پرداخت کردند.", "پرسیدن قیمت و پس‌انداز پول را بیان کن.", "sie nach dem Preis gefragt hätten", "hätten sie Geld gespart", "sie (جمع) · fragen · sparen", "inversion"),
  prompt("final-5", "چراغ را خاموش نکردم و انرژی هدر رفت.", "خاموش‌کردن چراغ و صرفه‌جویی انرژی را بیان کن.", "ich das Licht ausgeschaltet hätte", "hätte ich Energie gespart", "Licht · ausschalten · sparen", "meaning"),
  prompt("final-6", "نقشهٔ ساختمان را نخواندیم و اتاق را پیدا نکردیم.", "خواندن نقشه و پیداکردن اتاق را بیان کن.", "wir den Plan gelesen hätten", "hätten wir den Raum gefunden", "wir · Plan · Raum", "transfer"),
];
export const grammarDiagnostic = [
  { id: "perfekt", skill: "participle" as GrammarSkill, question: "دیروز با قطار رفتم. کدام Perfekt درست است؟", options: ["Ich habe mit dem Zug gefahren.", "Ich bin mit dem Zug gefahren.", "Ich bin mit dem Zug fahren."], correct: 1, explanation: "fahren در این معنای حرکت با sein و Partizip II یعنی gefahren می‌آید." },
  { id: "wenn", skill: "subordinate" as GrammarSkill, question: "بعد از wenn کدام ترتیب درست است؟", options: ["Wenn ich Zeit habe, komme ich.", "Wenn ich habe Zeit, ich komme.", "Wenn habe ich Zeit, komme ich."], correct: 0, explanation: "در جملهٔ وابسته، فعل صرف‌شده در انتهاست؛ در جملهٔ اصلی بعد از آن، فعل پیش از فاعل می‌آید." },
  { id: "past", skill: "meaning" as GrammarSkill, question: "قطار دیروز را از دست داده‌ام. کدام جمله دربارهٔ گذشتهٔ خلاف واقع است؟", options: ["Wenn ich Zeit habe, komme ich.", "Wenn ich Zeit hätte, käme ich.", "Wenn ich Zeit gehabt hätte, wäre ich gekommen."], correct: 2, explanation: "gehabt hätte و gekommen wäre دربارهٔ گذشته‌ای است که واقعاً اتفاق نیفتاده؛ دو جملهٔ دیگر زمان و معنای دیگری دارند." },
  { id: "aux", skill: "auxiliary" as GrammarSkill, question: "کدام جمله شرط خلاف واقع گذشته را درست می‌سازد؟", options: ["Wenn ich gelernt wäre, wäre ich bestanden.", "Wenn ich gelernt hätte, hätte ich die Prüfung bestanden.", "Wenn ich lernen würde, habe ich bestanden."], correct: 1, explanation: "lernen و bestehen در این معنا با haben می‌آیند؛ در گذشتهٔ خلاف واقع: gelernt hätte و hätte … bestanden." },
] as const;
