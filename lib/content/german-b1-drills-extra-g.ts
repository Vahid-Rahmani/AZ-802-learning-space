import type { GermanB1Drill } from "./german-b1-drills";

/**
 * Extra G: unique questions that replace earlier repeated prompts.
 *
 * The merged bank is deduplicated by prompt before these are appended, so the
 * final course has 50 distinct sentences per topic and 100 questions per topic.
 */
export const germanB1ExtraG: Record<string, GermanB1Drill[]> = {
  dativ: [
    { id: "g-d1", level: 1, prompt: "Das Geschenk ist ___ meiner Schwester.", translation: "هدیه از طرف خواهر من است.", options: ["von", "für", "bei", "zu"], correct: 0, why: "von + داتیو منشأ چیزی را نشان می‌دهد: von meiner Schwester." },
  ],
  akkusativ: [
    { id: "g-a1", level: 2, prompt: "Wir gehen den Fluss ___.", translation: "ما در امتداد رودخانه قدم می‌زنیم.", options: ["entlang", "gegen", "ohne", "durch"], correct: 0, why: "entlang بعد از اسم می‌آید و آکوزاتیو می‌گیرد: den Fluss entlang." },
    { id: "g-a2", level: 1, prompt: "Das Geschenk ist ___ dich.", translation: "این هدیه برای توست.", options: ["für", "gegen", "ohne", "um"], correct: 0, why: "für همیشه آکوزاتیو می‌گیرد و معنی «برای» دارد." },
    { id: "g-a3", level: 2, prompt: "Ich habe nichts ___ dich.", translation: "من هیچ مخالفتی با تو ندارم.", options: ["gegen", "für", "durch", "bis"], correct: 0, why: "gegen + آکوزاتیو یعنی «علیه/در برابر»؛ nichts gegen dich یعنی هیچ مخالفتی با تو ندارم." },
    { id: "g-a4", level: 1, prompt: "Wir bleiben ___ Montag in Berlin.", translation: "ما تا دوشنبه در برلین می‌مانیم.", options: ["bis", "für", "gegen", "ohne"], correct: 0, why: "bis مرز زمانی را نشان می‌دهد: bis Montag." },
    { id: "g-a5", level: 2, prompt: "Ich danke dir ___ die Hilfe.", translation: "از تو برای کمک سپاسگزارم.", options: ["für", "gegen", "ohne", "um"], correct: 0, why: "danken für + آکوزاتیو یعنی از کسی برای چیزی تشکر کردن." },
    { id: "g-a6", level: 2, prompt: "Sie interessiert sich ___ Technik.", translation: "او به فناوری علاقه دارد.", options: ["für", "gegen", "ohne", "um"], correct: 0, why: "sich interessieren für + آکوزاتیو." },
  ],
  wechsel: [
    { id: "g-w1", level: 2, prompt: "Die Katze springt ___ Tisch.", translation: "گربه روی میز می‌پرد.", options: ["auf den", "auf dem", "auf der", "auf die"], correct: 0, why: "springen حرکت به مقصد است (Wohin?)؛ der Tisch در آکوزاتیو می‌شود den Tisch." },
  ],
  modalverben: [
    { id: "g-m1", level: 1, prompt: "Du ___ heute früh aufstehen.", translation: "تو باید امروز زود بیدار شوی.", options: ["musst", "müssen", "müsst", "muss"], correct: 0, why: "فعل مُدال با du صرف می‌شود: du musst." },
  ],
  "verben-praepositionen": [
    { id: "g-v1", level: 1, prompt: "Ich freue mich ___ den Urlaub.", translation: "منتظر تعطیلات هستم.", options: ["auf", "über", "für", "an"], correct: 0, why: "sich freuen auf + آکوزاتیو برای انتظار چیزی در آینده." },
    { id: "g-v2", level: 2, prompt: "Sie ärgert sich ___ ihren Bruder.", translation: "او از برادرش عصبانی است.", options: ["über", "auf", "für", "an"], correct: 0, why: "sich ärgern über + آکوزاتیو یعنی از چیزی/کسی عصبانی بودن." },
    { id: "g-v3", level: 1, prompt: "Wir sprechen ___ das Problem.", translation: "ما دربارهٔ مشکل صحبت می‌کنیم.", options: ["über", "auf", "für", "an"], correct: 0, why: "sprechen über + آکوزاتیو یعنی دربارهٔ چیزی صحبت کردن." },
    { id: "g-v4", level: 3, prompt: "Er hat sich ___ die Stelle beworben.", translation: "او برای آن شغل درخواست داده است.", options: ["um", "auf", "für", "über"], correct: 0, why: "sich bewerben um + آکوزاتیو یعنی برای چیزی درخواست دادن." },
  ],
  zeiten: [
    { id: "g-z1", level: 1, prompt: "Morgen ___ ich die Prüfung schreiben.", translation: "فردا در آزمون شرکت خواهم کرد.", options: ["werde", "wurde", "habe", "bin"], correct: 0, why: "Futur I با werden + مصدر ساخته می‌شود: werde schreiben." },
  ],
  relativsatz: [
    { id: "g-r1", level: 2, prompt: "Der Mann, ___ ich gestern getroffen habe, ist mein Lehrer.", translation: "مردی که دیروز او را دیدم معلم من است.", options: ["den", "der", "dem", "die"], correct: 0, why: "ضمیر موصولی مفعول مستقیم مذکر است: den." },
    { id: "g-r2", level: 2, prompt: "Die Freundin, ___ mir geholfen hat, wohnt hier.", translation: "دوستی که به من کمک کرد اینجا زندگی می‌کند.", options: ["die", "der", "den", "dem"], correct: 0, why: "ضمیر موصولی فاعل مؤنث است: die." },
  ],
  adjektive: [
    { id: "g-ad1", level: 1, prompt: "Das ist ein ___ Auto.", translation: "این یک ماشین جدید است.", options: ["neues", "neue", "neuen", "neuem"], correct: 0, why: "das Auto خنثی است؛ Nominativ بعد از ein: neues." },
    { id: "g-ad2", level: 1, prompt: "Ich habe einen ___ Computer gekauft.", translation: "من یک کامپیوتر جدید خریده‌ام.", options: ["neuen", "neue", "neuer", "neuem"], correct: 0, why: "der Computer مذکر است؛ Akkusativ بعد از einen: neuen." },
    { id: "g-ad3", level: 2, prompt: "Wir wohnen in einem ___ Haus.", translation: "ما در یک خانهٔ قدیمی زندگی می‌کنیم.", options: ["alten", "alte", "alter", "altes"], correct: 0, why: "Dativ خنثی بعد از einem: alten." },
    { id: "g-ad4", level: 2, prompt: "Sie kommt mit einer ___ Freundin.", translation: "او با یک دوست خوب می‌آید.", options: ["guten", "gute", "guter", "gutem"], correct: 0, why: "Dativ مؤنث بعد از einer: guten." },
    { id: "g-ad5", level: 1, prompt: "Der ___ Mann wartet draußen.", translation: "مرد مسن بیرون منتظر است.", options: ["alte", "alter", "alten", "altes"], correct: 0, why: "Nominativ مذکر با der: alte." },
    { id: "g-ad6", level: 1, prompt: "Die ___ Frau liest ein Buch.", translation: "زن جوان کتاب می‌خواند.", options: ["junge", "jungen", "junger", "junges"], correct: 0, why: "Nominativ مؤنث با die: junge." },
    { id: "g-ad7", level: 1, prompt: "Das ___ Kind spielt im Garten.", translation: "کودک کوچک در باغ بازی می‌کند.", options: ["kleine", "kleinen", "kleiner", "kleines"], correct: 0, why: "Nominativ خنثی با das: kleine." },
    { id: "g-ad8", level: 2, prompt: "Ich sehe den ___ Lehrer.", translation: "من معلم جدید را می‌بینم.", options: ["neuen", "neue", "neuer", "neuem"], correct: 0, why: "Akkusativ مذکر با den: neuen." },
    { id: "g-ad9", level: 2, prompt: "Wir helfen der ___ Nachbarin.", translation: "ما به همسایهٔ مسن کمک می‌کنیم.", options: ["alten", "alte", "alter", "altes"], correct: 0, why: "Dativ مؤنث با der: alten." },
    { id: "g-ad10", level: 2, prompt: "Er spricht mit dem ___ Kollegen.", translation: "او با همکار جدید صحبت می‌کند.", options: ["neuen", "neue", "neuer", "neues"], correct: 0, why: "Dativ مذکر با dem: neuen." },
    { id: "g-ad11", level: 1, prompt: "Das ist eine ___ Idee.", translation: "این ایدهٔ خوبی است.", options: ["gute", "guten", "guter", "gutem"], correct: 0, why: "Nominativ مؤنث بعد از eine: gute." },
    { id: "g-ad12", level: 2, prompt: "Ich trinke ___ Kaffee.", translation: "من قهوهٔ گرم می‌نوشم.", options: ["heißen", "heiße", "heißem", "heißer"], correct: 0, why: "Akkusativ مذکر بدون حرف تعریف: heißen Kaffee." },
    { id: "g-ad13", level: 2, prompt: "Sie kauft ___ Brot.", translation: "او نان تازه می‌خرد.", options: ["frisches", "frische", "frischem", "frischen"], correct: 0, why: "Akkusativ خنثی بدون حرف تعریف: frisches Brot." },
    { id: "g-ad14", level: 2, prompt: "Wir brauchen ___ Stühle.", translation: "ما صندلی‌های جدید لازم داریم.", options: ["neue", "neuen", "neuer", "neuem"], correct: 0, why: "جمع Akkusativ بدون حرف تعریف: neue Stühle." },
    { id: "g-ad15", level: 2, prompt: "Das Wetter ist heute ___ als gestern.", translation: "هوا امروز از دیروز بهتر است.", options: ["besser", "gut", "beste", "am besten"], correct: 0, why: "مقایسهٔ gut بی‌قاعده است: gut – besser – am besten." },
    { id: "g-ad16", level: 3, prompt: "Dieses Buch ist das ___ Buch, das ich kenne.", translation: "این کتاب بهترین کتابی است که می‌شناسم.", options: ["beste", "besser", "besten", "gute"], correct: 0, why: "برترین با حرف تعریف خنثی das: das beste Buch." },
    { id: "g-ad17", level: 2, prompt: "Mein Bruder ist ___ als ich.", translation: "برادرم از من بزرگ‌تر است.", options: ["älter", "alt", "älteste", "am ältesten"], correct: 0, why: "مقایسهٔ alt: alt – älter – am ältesten." },
    { id: "g-ad18", level: 2, prompt: "Der Winter ist ___ als der Herbst.", translation: "زمستان از پاییز سردتر است.", options: ["kälter", "kalt", "kälteste", "am kältesten"], correct: 0, why: "مقایسهٔ kalt: kalt – kälter – am kältesten." },
    { id: "g-ad19", level: 2, prompt: "Sie ist die ___ Schülerin in der Klasse.", translation: "او بهترین دانش‌آموز کلاس است.", options: ["beste", "besser", "besten", "gut"], correct: 0, why: "برترین مؤنث با die: die beste Schülerin." },
    { id: "g-ad20", level: 3, prompt: "Je mehr ich übe, ___ werde ich.", translation: "هر چه بیشتر تمرین کنم بهتر می‌شوم.", options: ["besser", "gut", "beste", "mehr"], correct: 0, why: "ساختار je ... desto besser یعنی هر چه ... بهتر." },
    { id: "g-ad21", level: 2, prompt: "Er läuft ___ als sein Freund.", translation: "او از دوستش سریع‌تر می‌دود.", options: ["schneller", "schnell", "schnellste", "am schnellsten"], correct: 0, why: "مقایسهٔ schnell: schnell – schneller – am schnellsten." },
  ],
  passiv: [
    { id: "g-p1", level: 1, prompt: "Die Prüfung ___ morgen korrigiert.", translation: "آزمون فردا تصحیح می‌شود.", options: ["wird", "werden", "wurde", "ist"], correct: 0, why: "Passiv حال؛ فاعل مفرد die Prüfung: wird korrigiert." },
    { id: "g-p2", level: 2, prompt: "Die Fenster ___ gestern geputzt.", translation: "پنجره‌ها دیروز تمیز شدند.", options: ["wurden", "wird", "werden", "hat"], correct: 0, why: "Passiv گذشته با فاعل جمع: wurden geputzt." },
    { id: "g-p3", level: 2, prompt: "Der Bericht ___ bis Freitag geschrieben werden.", translation: "گزارش باید تا جمعه نوشته شود.", options: ["muss", "musst", "müssen", "müsst"], correct: 0, why: "فاعل مفرد der Bericht؛ muss + Partizip II + werden." },
    { id: "g-p4", level: 3, prompt: "Die Tickets ___ online gekauft werden.", translation: "بلیت‌ها را می‌توان آنلاین خرید.", options: ["können", "kann", "konnte", "könnt"], correct: 0, why: "فاعل جمع die Tickets؛ فعل مُدال können." },
    { id: "g-p5", level: 1, prompt: "Das Essen ___ gerade serviert.", translation: "غذا همین حالا سرو می‌شود.", options: ["wird", "werden", "wurde", "ist"], correct: 0, why: "Passiv حال؛ فاعل مفرد das Essen: wird serviert." },
    { id: "g-p6", level: 2, prompt: "Die Straße ___ letztes Jahr renoviert.", translation: "خیابان سال گذشته بازسازی شد.", options: ["wurde", "wird", "werden", "hat"], correct: 0, why: "Passiv گذشته؛ فاعل مفرد: wurde renoviert." },
    { id: "g-p7", level: 1, prompt: "Die Daten ___ jede Nacht gesichert.", translation: "داده‌ها هر شب پشتیبان‌گیری می‌شوند.", options: ["werden", "wird", "wurde", "sind"], correct: 0, why: "Passiv حال با فاعل جمع: werden gesichert." },
    { id: "g-p8", level: 3, prompt: "Der Antrag ___ heute geprüft werden.", translation: "درخواست باید امروز بررسی شود.", options: ["soll", "sollst", "sollen", "sollte"], correct: 0, why: "فاعل مفرد der Antrag؛ soll + Partizip II + werden." },
    { id: "g-p9", level: 1, prompt: "Die Blumen ___ jeden Morgen gegossen.", translation: "گل‌ها هر صبح آبیاری می‌شوند.", options: ["werden", "wird", "wurde", "sind"], correct: 0, why: "Passiv حال با فاعل جمع: werden gegossen." },
    { id: "g-p10", level: 2, prompt: "Das Paket ___ vorgestern geliefert.", translation: "بسته پریروز تحویل داده شد.", options: ["wurde", "wird", "werden", "hat"], correct: 0, why: "Passiv گذشته؛ فاعل مفرد: wurde geliefert." },
    { id: "g-p11", level: 2, prompt: "Die Rechnung ___ sofort bezahlt werden.", translation: "صورت‌حساب باید فوراً پرداخت شود.", options: ["muss", "musst", "müssen", "müsst"], correct: 0, why: "فاعل مفرد die Rechnung؛ muss + Partizip II + werden." },
    { id: "g-p12", level: 1, prompt: "Die Ergebnisse ___ morgen veröffentlicht.", translation: "نتایج فردا منتشر می‌شوند.", options: ["werden", "wird", "wurde", "sind"], correct: 0, why: "Passiv حال با فاعل جمع: werden veröffentlicht." },
    { id: "g-p13", level: 2, prompt: "Das Museum ___ 2010 eröffnet.", translation: "موزه در سال ۲۰۱۰ افتتاح شد.", options: ["wurde", "wird", "werden", "hat"], correct: 0, why: "Passiv گذشته؛ فاعل مفرد: wurde eröffnet." },
    { id: "g-p14", level: 3, prompt: "Die Aufgaben ___ bis Montag erledigt werden.", translation: "کارها باید تا دوشنبه انجام شوند.", options: ["müssen", "muss", "musst", "müsst"], correct: 0, why: "فاعل جمع die Aufgaben؛ فعل مُدال müssen." },
  ],
  schreiben: [
    { id: "g-s1", level: 2, prompt: "Ich beziehe mich ___ Ihre Anzeige.", translation: "من به آگهی شما استناد می‌کنم.", options: ["auf", "für", "über", "an"], correct: 0, why: "sich beziehen auf + آکوزاتیو." },
    { id: "g-s2", level: 1, prompt: "Vielen Dank für Ihre ___.", translation: "از پاسخ شما سپاسگزارم.", options: ["Antwort", "Antworten", "Antworte", "antworten"], correct: 0, why: "پس از für با حرف تعریف Ihre اسم مفرد Antwort می‌آید." },
    { id: "g-s3", level: 2, prompt: "Ich möchte mich ___ die Lieferung beschweren.", translation: "می‌خواهم از نحوهٔ تحویل شکایت کنم.", options: ["über", "auf", "für", "an"], correct: 0, why: "sich beschweren über + آکوزاتیو." },
    { id: "g-s4", level: 2, prompt: "Bitte senden Sie mir eine ___ Bestätigung.", translation: "لطفاً یک تأییدیهٔ کتبی برایم بفرستید.", options: ["schriftliche", "schriftlich", "schriftlichen", "schriftlicher"], correct: 0, why: "Akkusativ مؤنث بعد از eine: schriftliche Bestätigung." },
    { id: "g-s5", level: 1, prompt: "Ich habe eine Frage ___ Kurs.", translation: "دربارهٔ دوره یک سؤال دارم.", options: ["zum", "zur", "beim", "am"], correct: 0, why: "Frage zu + داتیو؛ der Kurs ← zum Kurs." },
    { id: "g-s6", level: 3, prompt: "Könnten Sie mir bitte ___ , ob der Termin frei ist?", translation: "می‌توانید لطفاً به من بگویید آیا این زمان آزاد است؟", options: ["mitteilen", "mitteilt", "mitgeteilt", "mitteilst"], correct: 0, why: "بعد از فعل مُدال، مصدر در پایان جمله می‌آید: mitteilen." },
    { id: "g-s7", level: 1, prompt: "Ich freue mich ___ Ihr Angebot.", translation: "منتظر پیشنهاد شما هستم.", options: ["auf", "über", "für", "an"], correct: 0, why: "sich freuen auf + آکوزاتیو برای انتظار چیزی در آینده." },
    { id: "g-s8", level: 2, prompt: "Leider ist die Ware beschädigt ___.", translation: "متأسفانه کالا آسیب‌دیده رسیده است.", options: ["angekommen", "ankommen", "ankam", "kommt"], correct: 0, why: "Perfekt با sein و Partizip II: ist angekommen." },
    { id: "g-s9", level: 2, prompt: "Wir bitten ___ Entschuldigung.", translation: "ما پوزش می‌خواهیم.", options: ["um", "für", "über", "an"], correct: 0, why: "um Entschuldigung bitten یعنی عذرخواهی کردن." },
    { id: "g-s10", level: 3, prompt: "Ich schreibe Ihnen ___ meiner Bewerbung.", translation: "من به مناسبت درخواست شغلم به شما می‌نویسم.", options: ["anlässlich", "für", "mit", "auf"], correct: 0, why: "anlässlich + جنیتیو یعنی به مناسبت." },
    { id: "g-s11", level: 1, prompt: "Bitte bestätigen Sie mir den Termin ___ E-Mail.", translation: "لطفاً قرار را از طریق ایمیل تأیید کنید.", options: ["per", "mit", "auf", "für"], correct: 0, why: "per E-Mail یعنی از طریق ایمیل." },
    { id: "g-s12", level: 2, prompt: "Ich hoffe, dass ich bald eine Antwort ___.", translation: "امیدوارم به‌زودی پاسخی دریافت کنم.", options: ["erhalte", "erhalten", "erhielt", "erhalte ich"], correct: 0, why: "در جملهٔ فرعی با dass فعل صرف‌شده به پایان می‌رود: erhalte." },
    { id: "g-s13", level: 3, prompt: "Sehr geehrte Frau Weber, ich schreibe Ihnen ___ meiner Bestellung.", translation: "خانم وبر محترم، دربارهٔ سفارشم به شما می‌نویسم.", options: ["bezüglich", "für", "mit", "über"], correct: 0, why: "bezüglich + جنیتیو یعنی دربارهٔ." },
    { id: "g-s14", level: 3, prompt: "Ich würde mich freuen, wenn Sie mir ___.", translation: "خوشحال می‌شوم اگر بتوانید به من کمک کنید.", options: ["helfen könnten", "helfen können", "geholfen könnten", "hilfe könnten"], correct: 0, why: "در جملهٔ فرعی فرضی، فعل مُدال به پایان می‌رود: helfen könnten." },
    { id: "g-s15", level: 1, prompt: "Vielen Dank im ___ für Ihre Unterstützung.", translation: "از پیش از حمایت شما سپاسگزارم.", options: ["Voraus", "voraus", "Voraus.", "voraus!"], correct: 0, why: "عبارت ثابت: Vielen Dank im Voraus." },
    { id: "g-s16", level: 1, prompt: "Ich verbleibe mit freundlichen ___", translation: "با سلام گرم (پایان نامه)", options: ["Grüßen", "Grüße", "Gruß", "grüßen"], correct: 0, why: "پایان ثابت نامه: Mit freundlichen Grüßen." },
    { id: "g-s17", level: 2, prompt: "Bitte geben Sie mir ___ , sobald der Termin feststeht.", translation: "لطفاً به‌محض مشخص شدن قرار به من اطلاع دهید.", options: ["Bescheid", "bescheid", "Bescheide", "Bescheides"], correct: 0, why: "عبارت ثابت: jemandem Bescheid geben." },
  ],
};
