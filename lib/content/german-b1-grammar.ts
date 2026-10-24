import type { GermanLesson, GermanUnit } from "./german-learning";
import { germanB1DrillModules } from "./german-b1-drills";

export const b1GrammarUnits: GermanUnit[] = [
  ["01", "Präpositionen mit Dativ", "mit · nach · aus · bei · von · zu · seit · gegenüber", "حروف اضافه‌ای که همیشه داتیو می‌گیرند."],
  ["02", "Präpositionen mit Akkusativ", "durch · für · gegen · ohne · um · bis · entlang", "حروف اضافه‌ای که همیشه آکوزاتیو می‌گیرند."],
  ["03", "Wechselpräpositionen", "in · an · auf · unter · über · vor · hinter · neben · zwischen", "Wo با داتیو و Wohin با آکوزاتیو."],
  ["04", "Dativ und Akkusativ", "mir/mich · dem/den · ضمایر و آرتیکل‌ها", "تشخیص گیرنده و مفعول مستقیم."],
  ["05", "Nebensätze", "weil · dass · wenn · obwohl · als · bevor · nachdem · während", "جملهٔ فرعی و فعل در پایان."],
  ["06", "Modalverben", "können · müssen · dürfen · sollen · wollen · mögen · möchten", "توانایی، اجبار، اجازه و درخواست مؤدبانه."],
  ["07", "Verben mit Präpositionen", "warten auf · denken an · sich interessieren für", "ترکیب‌های ثابت فعل و حرف اضافه."],
  ["08", "Zeiten", "Präsens · Perfekt · Präteritum · Plusquamperfekt · Futur I", "انتخاب زمان مناسب برای حال، گذشته و آینده."],
  ["09", "Relativsätze", "der · die · das · dessen · deren · dem · den", "ضمیر موصولی بر اساس جنس و نقش."],
  ["10", "Adjektive und Deklination", "حروف تعریف · پایان صفت · مقایسه", "صرف صفت و مقایسهٔ درست."],
  ["11", "Passiv und Konjunktiv II", "wird gemacht · würde · hätte · wäre · könnte", "مجهول، ادب و موقعیت فرضی."],
  ["12", "Schreiben und Prüfung B1", "ایمیل · نظر · درخواست · شکایت · متن پیوسته", "تبدیل گرامر به نوشتن واقعی B1."],
].map(([number, title, grammar, description]) => ({
  id: `unit${Number(number) + 12}`,
  level: "B1+",
  title: `${number} · ${title}`,
  grammar,
  description,
}));

const words = (...items: Array<[string, string, string]>) =>
  items.map(([term, meaningFa, example]) => ({ term, meaningFa, example }));

const lesson = (
  id: number,
  unitId: number,
  title: string,
  grammar: string,
  model: string,
  translationFa: string,
  explanationFa: string,
  writingPrompt: string,
  vocabulary: Array<[string, string, string]>,
  variants: string[] = [],
): GermanLesson => ({
  id: `lesson${String(id).padStart(3, "0")}`,
  unitId: `unit${unitId + 12}`,
  level: "B1+",
  title,
  grammar,
  scenario: "Use the target structure in a realistic B1 situation.",
  model,
  translationFa,
  explanationFa,
  vocabulary: words(...vocabulary),
  recallPrompt: "Repeat the model sentence, then make one new sentence with the same structure.",
  variants,
  writingPrompt,
  writingChecklist: ["ساختار هدف را استفاده کن.", "جایگاه فعل و پایان صفت را بررسی کن.", "حروف بزرگ اسم‌ها و نشانه‌گذاری را چک کن."],
});

export const b1GrammarLessons: GermanLesson[] = [
  lesson(61, 1, "Dativ در رفت‌وآمد", "mit + Dativ · zu + Dativ", "Ich fahre mit dem Bus zum Deutschkurs.", "من با اتوبوس به کلاس آلمانی می‌روم.", "mit و zu همیشه داتیو می‌گیرند: mit dem Bus، zum Deutschkurs.", "با mit و zu دربارهٔ رفتن به کلاس یا محل کار بنویس.", [["der Bus", "اتوبوس", "Der Bus kommt um acht Uhr."], ["der Kurs", "کلاس", "Der Kurs beginnt heute."]], ["Ich fahre mit dem Zug zur Arbeit."]),
  lesson(62, 1, "seit، bei و gegenüber", "seit · bei · gegenüber + Dativ", "Seit einem Jahr arbeite ich bei einer Firma gegenüber dem Bahnhof.", "یک سال است در شرکتی روبه‌روی ایستگاه کار می‌کنم.", "seit مدت تا اکنون، bei محل یا سازمان و gegenüber روبه‌رو را نشان می‌دهد؛ همگی با داتیو می‌آیند.", "محل زندگی یا کار خود را با seit، bei یا gegenüber توصیف کن.", [["seit", "از ... تاکنون", "Seit Montag lerne ich."], ["die Firma", "شرکت", "Die Firma ist modern."]], ["Das Café liegt gegenüber dem Museum."]),
  lesson(63, 2, "für و gegen", "für + Akkusativ · gegen + Akkusativ", "Das Geschenk ist für meinen Bruder, und der Termin ist gegen zehn Uhr.", "هدیه برای برادرم است و قرار حدود ساعت ده است.", "für و gegen همیشه آکوزاتیو می‌گیرند: für meinen Bruder، gegen zehn Uhr.", "یک جمله دربارهٔ هدیه یا زمان یک قرار بنویس.", [["das Geschenk", "هدیه", "Das Geschenk ist schön."], ["der Termin", "قرار", "Ich habe morgen einen Termin."]], ["Wir treffen uns gegen fünf Uhr."]),
  lesson(64, 2, "ohne، durch و entlang", "ohne · durch · entlang + Akkusativ", "Wir gehen ohne den Regenschirm durch den Park und die Straße entlang.", "بدون چتر از پارک عبور می‌کنیم و در امتداد خیابان می‌رویم.", "ohne و durch قبل از اسم می‌آیند؛ entlang اغلب بعد از اسم می‌آید و این ساختارها آکوزاتیو می‌خواهند.", "یک مسیر کوتاه را با ohne، durch و entlang توصیف کن.", [["der Regenschirm", "چتر", "Ich nehme den Regenschirm mit."], ["der Park", "پارک", "Der Park ist ruhig."]], ["Wir laufen den Fluss entlang."]),
  lesson(65, 3, "Wo? موقعیت با داتیو", "Wechselpräpositionen + Dativ", "Das Buch liegt auf dem Tisch neben der Lampe.", "کتاب روی میز و کنار چراغ قرار دارد.", "برای Wo? و موقعیت ثابت، حرف اضافهٔ دوحالته داتیو می‌گیرد: auf dem Tisch، neben der Lampe.", "محل دو وسیله را با Wo? و داتیو توصیف کن.", [["liegen", "قرار داشتن", "Das Buch liegt auf dem Tisch."], ["neben", "کنار", "Die Tasche liegt neben dem Stuhl."]], ["Der Schlüssel liegt unter dem Buch."]),
  lesson(66, 3, "Wohin? مقصد با آکوزاتیو", "Wechselpräpositionen + Akkusativ", "Ich stelle die Lampe auf den Tisch und den Stuhl in das Zimmer.", "چراغ را روی میز و صندلی را داخل اتاق می‌گذارم.", "برای Wohin? و حرکت به مقصد، آکوزاتیو می‌آید: auf den Tisch، in das Zimmer.", "دو وسیله را به مقصدهای مختلف منتقل کن.", [["stellen", "عمودی گذاشتن", "Ich stelle die Flasche auf den Tisch."], ["das Zimmer", "اتاق", "Das Zimmer ist hell."]], ["Ich lege das Handy neben das Bett."]),
  lesson(67, 4, "گیرنده و مفعول مستقیم", "Dativ + Akkusativ", "Ich gebe meinem Kollegen den wichtigen Bericht.", "گزارش مهم را به همکارم می‌دهم.", "گیرنده داتیو است: meinem Kollegen؛ شیء مستقیم آکوزاتیو است: den Bericht.", "یک جمله با jemandem etwas geben بنویس.", [["geben", "دادن", "Ich gebe dir das Buch."], ["der Bericht", "گزارش", "Der Bericht ist fertig."]], ["Wir zeigen dem Lehrer die Lösung."]),
  lesson(68, 4, "mir یا mich؟", "helfen + Dativ · anrufen + Akkusativ", "Kannst du mir helfen? Ruf mich bitte später an.", "می‌توانی به من کمک کنی؟ لطفاً بعداً با من تماس بگیر.", "helfen با داتیو و anrufen با آکوزاتیو می‌آید؛ نقش فعل را حفظ کن: mir helfen، mich anrufen.", "دو جمله با mir و mich بنویس.", [["helfen", "کمک کردن", "Kannst du mir helfen?"], ["anrufen", "تماس گرفتن", "Ich rufe dich an."]], ["Sie besucht mich am Wochenende."]),
  lesson(69, 5, "weil و dass", "Nebensatz · فعل در پایان", "Ich lerne Deutsch, weil ich die B1-Prüfung bestehen möchte.", "آلمانی می‌خوانم، چون می‌خواهم در آزمون B1 قبول شوم.", "در جملهٔ فرعی با weil و dass، فعل صرف‌شده به پایان می‌رود: weil ich ... möchte.", "یک جمله با weil یا dass دربارهٔ هدف یادگیری بنویس.", [["bestehen", "قبول شدن", "Ich möchte die Prüfung bestehen."], ["wichtig", "مهم", "Die Prüfung ist wichtig."]], ["Ich weiß, dass die Prüfung wichtig ist."]),
  lesson(70, 5, "obwohl، bevor و nachdem", "فعل در پایان جملهٔ فرعی", "Obwohl es regnet, lerne ich, bevor ich zur Prüfung gehe.", "با اینکه باران می‌بارد، قبل از رفتن به آزمون درس می‌خوانم.", "obwohl تضاد و bevor یا nachdem ترتیب زمانی می‌سازند؛ فعل در جملهٔ فرعی آخر می‌آید.", "یک جملهٔ ترکیبی با obwohl، bevor یا nachdem بساز.", [["obwohl", "با اینکه", "Obwohl ich müde bin, lerne ich."], ["bevor", "قبل از اینکه", "Bevor ich schlafe, lese ich."]], ["Wenn ich Zeit habe, wiederhole ich die Regeln."]),
  lesson(71, 6, "توانایی، اجبار و اجازه", "können · müssen · dürfen", "Ich kann heute lernen, aber ich muss auch arbeiten. Darf ich später gehen?", "امروز می‌توانم درس بخوانم، اما باید کار کنم. اجازه دارم بعداً بروم؟", "فعل مُدال صرف می‌شود و مصدر فعل اصلی به پایان می‌رود: Ich muss arbeiten.", "سه جمله دربارهٔ برنامهٔ امروز با können، müssen و dürfen بنویس.", [["können", "توانستن", "Ich kann dir helfen."], ["müssen", "باید", "Wir müssen arbeiten."], ["dürfen", "اجازه داشتن", "Darf ich eintreten?"]], ["Wir dürfen hier nicht parken."]),
  lesson(72, 6, "خواستن و درخواست مؤدبانه", "wollen · sollen · mögen · möchten", "Ich möchte einen Tee, und wir wollen am Wochenende wandern.", "یک چای می‌خواهم و آخر هفته می‌خواهیم کوه‌پیمایی کنیم.", "möchten درخواست مؤدبانه و wollen قصد را بیان می‌کند؛ sollen توصیه و mögen علاقه است.", "یک درخواست با möchten و یک برنامه با wollen بنویس.", [["möchten", "خواستن مؤدبانه", "Ich möchte einen Kaffee."], ["wollen", "قصد داشتن", "Wir wollen morgen starten."]], ["Ich mag deutsche Musik."]),
  lesson(73, 7, "warten auf و denken an", "فعل + حرف اضافه + Akkusativ", "Ich warte auf den Zug und denke an den Termin.", "منتظر قطار هستم و به قرار فکر می‌کنم.", "ترکیب‌ها را به صورت واحد حفظ کن: warten auf و denken an؛ هر دو اینجا آکوزاتیو می‌گیرند.", "دو جمله با warten auf و denken an بنویس.", [["warten auf", "منتظر بودن", "Wir warten auf den Bus."], ["denken an", "فکر کردن به", "Ich denke an meine Familie."]], ["Sie wartet auf ihre Freundin."]),
  lesson(74, 7, "sich interessieren für", "sich interessieren für + Akkusativ", "Ich interessiere mich für deutsche Geschichte und neue Technologien.", "به تاریخ آلمان و فناوری‌های جدید علاقه‌مندم.", "ضمیر بازتابی با شخص هماهنگ می‌شود: ich interessiere mich؛ für آکوزاتیو می‌گیرد.", "دربارهٔ دو موضوع مورد علاقهٔ خود بنویس.", [["sich interessieren für", "علاقه‌مند بودن", "Sie interessiert sich für Kunst."], ["die Geschichte", "تاریخ", "Geschichte ist spannend."]], ["Wofür interessierst du dich?"]),
  lesson(75, 8, "Präsens و Perfekt", "حال و گذشتهٔ گفتاری", "Ich lerne jeden Tag Deutsch. Gestern habe ich die Regeln wiederholt.", "هر روز آلمانی می‌خوانم. دیروز قواعد را مرور کردم.", "Präsens برای عادت و Perfekt با haben/sein + Partizip II برای گذشتهٔ گفتاری است.", "یک جمله در Präsens و یک جمله در Perfekt بنویس.", [["jeden Tag", "هر روز", "Ich übe jeden Tag."], ["wiederholen", "مرور کردن", "Ich wiederhole die Wörter."]], ["Wir haben gestern einen Film gesehen."]),
  lesson(76, 8, "Präteritum، Plusquamperfekt و Futur I", "روایت گذشته و آینده", "Bevor ich kam, hatte ich schon gelernt. Morgen werde ich weiterüben.", "قبل از آمدنم درس خوانده بودم. فردا تمرین را ادامه خواهم داد.", "Plusquamperfekt رخدادِ پیش‌تر را نشان می‌دهد: hatte gelernt؛ Futur I با werden + مصدر ساخته می‌شود.", "یک روایت کوتاه با hatte و werde بنویس.", [["schon", "قبلاً", "Ich hatte schon gegessen."], ["weiterüben", "ادامهٔ تمرین", "Morgen werde ich weiterüben."]], ["Nächste Woche werde ich eine Prüfung schreiben."]),
  lesson(77, 9, "ضمیر موصولی در Nominativ", "der · die · das", "Das ist die Frau, die neben mir wohnt.", "این همان زنی است که کنار من زندگی می‌کند.", "ضمیر موصولی جنس و شمار اسم قبلی را می‌گیرد و فعل جملهٔ موصولی در پایان می‌آید.", "یک شخص یا شیء را با ضمیر موصولی در نقش فاعل توصیف کن.", [["die Frau", "زن", "Die Frau arbeitet hier."], ["wohnen", "زندگی کردن", "Ich wohne in Berlin."]], ["Das ist der Mann, der Deutsch unterrichtet."]),
  lesson(78, 9, "ضمیر موصولی در Akkusativ و Dativ", "den · die · das · dem · der", "Der Film, den wir sehen, ist spannend. Die Frau, der ich geholfen habe, ist meine Nachbarin.", "فیلمی که می‌بینیم هیجان‌انگیز است؛ زنی که به او کمک کرده‌ام همسایهٔ من است.", "حالت ضمیر موصولی را نقش آن در جملهٔ داخلی تعیین می‌کند: den برای مفعول مذکر و der برای داتیو مؤنث.", "دو جمله را با ضمیر موصولی در آکوزاتیو یا داتیو ترکیب کن.", [["spannend", "هیجان‌انگیز", "Der Film ist spannend."], ["helfen", "کمک کردن", "Ich helfe der Frau."]], ["Das ist der Kurs, den ich besuche."]),
  lesson(79, 10, "صفت بعد از آرتیکل نامعین", "eine neue Wohnung · einem kleinen Balkon", "Ich suche eine neue Wohnung mit einem kleinen Balkon.", "دنبال یک آپارتمان جدید با یک بالکن کوچک می‌گردم.", "بعد از آرتیکل نامعین، پایان صفت بخشی از جنس و حالت را نشان می‌دهد: eine neue، einem kleinen.", "یک مکان را با دست‌کم دو صفت توصیف کن.", [["neu", "جدید", "Die Wohnung ist neu."], ["klein", "کوچک", "Der Balkon ist klein."]], ["Wir wohnen in einem hellen Zimmer."]),
  lesson(80, 10, "مقایسه و برترین", "größer als · so ... wie · am besten", "Schreiben ist schwieriger als Lesen, aber Sprechen ist am wichtigsten.", "نوشتن از خواندن سخت‌تر است، اما صحبت کردن مهم‌ترین است.", "برای مقایسه -er + als و برای برترین am + -sten می‌آید؛ gut بی‌قاعده است: besser، am besten.", "دو مهارت را مقایسه کن و مهم‌ترین را انتخاب کن.", [["schwierig", "سخت", "Die Aufgabe ist schwierig."], ["wichtig", "مهم", "Das ist wichtig."], ["am besten", "بهترین", "So lerne ich am besten."]], ["Deutsch ist leichter als Mathematik."]),
  lesson(81, 11, "Passiv در زمان حال", "werden + Partizip II", "Die E-Mail wird heute beantwortet und der Antrag wird geprüft.", "ایمیل امروز پاسخ داده می‌شود و درخواست بررسی می‌شود.", "در Passiv تمرکز روی عمل است: werden صرف می‌شود و Partizip II به پایان می‌رود.", "دو کار اداری را با مجهول زمان حال بنویس.", [["beantworten", "پاسخ دادن", "Ich beantworte die E-Mail."], ["prüfen", "بررسی کردن", "Wir prüfen den Antrag."]], ["Die Daten werden gespeichert."]),
  lesson(82, 11, "Konjunktiv II برای فرض و ادب", "würde · hätte · wäre · könnte", "Wenn ich mehr Zeit hätte, würde ich jeden Tag schreiben.", "اگر وقت بیشتری داشتم، هر روز می‌نوشتم.", "Konjunktiv II برای حالت فرضی و درخواست مؤدبانه است: hätte، wäre، könnte و würde + مصدر.", "یک آرزو یا درخواست مؤدبانه با Konjunktiv II بنویس.", [["die Zeit", "وقت", "Ich habe wenig Zeit."], ["könnte", "می‌توانستم", "Könnte ich bitte zahlen?"]], ["Könnten Sie mir bitte helfen?"]),
  lesson(83, 12, "ایمیل B1: درخواست روشن", "Anrede · دلیل · درخواست · پایان", "Sehr geehrte Damen und Herren, ich schreibe Ihnen, weil ich eine Frage zum B1-Kurs habe.", "خانم‌ها و آقایان محترم، دربارهٔ دورهٔ B1 یک سؤال دارم.", "ایمیل رسمی با خطاب محترمانه شروع می‌شود؛ دلیل را با weil و درخواست را روشن بنویس.", "یک ایمیل رسمی کوتاه با سلام، دلیل، درخواست و پایان بنویس.", [["die Frage", "سؤال", "Ich habe eine Frage."], ["der Kurs", "دوره", "Der Kurs beginnt im Mai."]], ["Könnten Sie mir bitte den Prüfungstermin mitteilen?"]),
  lesson(84, 12, "نظر شخصی و شکایت", "Meiner Meinung nach · deshalb · trotzdem", "Meiner Meinung nach ist tägliches Schreiben wichtig, deshalb wünsche ich mir mehr Schreibübungen.", "به نظر من نوشتن روزانه مهم است، بنابراین تمرین نوشتاری بیشتری می‌خواهم.", "برای نظر از Meiner Meinung nach و برای نتیجه از deshalb استفاده کن؛ مشکل و درخواست را مؤدبانه بنویس.", "یک متن پیوستهٔ کوتاه با نظر، دلیل، مشکل یا پیشنهاد و نتیجه بنویس.", [["Meiner Meinung nach", "به نظر من", "Meiner Meinung nach ist das wichtig."], ["deshalb", "بنابراین", "Deshalb schreibe ich Ihnen."]], ["Trotzdem bin ich mit dem Kurs zufrieden."]),
];

export type B1QuestionFormat = "choice" | "fill" | "fix" | "order";

export interface B1GrammarQuestion {
  id: string;
  unitId: string;
  prompt: string;
  translationFa: string;
  options: string[];
  correctIndex: number;
  explanationFa: string;
  format: B1QuestionFormat;
  level: 1 | 2 | 3;
  /** 0 or 1: which of the two lessons in a topic shows this question. */
  lessonSlot: 0 | 1;
  /** The expected answer; for choice/fix/order it is also options[correctIndex]. */
  answer: string;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Move the correct option to a deterministic position so answers do not all sit at A. */
function arrangeOptions(options: string[], correctText: string, key: string) {
  const wrong = [...new Set(options)].filter(option => option !== correctText).slice(0, 3);
  const position = stableHash(key) % 4;
  const arranged = [...wrong];
  arranged.splice(position, 0, correctText);
  return { options: arranged, correctIndex: position };
}

/** Fill every blank of a multiple-blank prompt with the parts of one answer. */
function fillPrompt(prompt: string, fill: string): string {
  const parts = fill.split(" / ");
  let index = 0;
  return prompt.replace(/___/g, () => parts[Math.min(index++, parts.length - 1)] ?? "");
}

/** Scramble whole words while keeping each word intact, so the learner builds the sentence. */
function scrambleSentence(sentence: string, key: string): string {
  const chunks = sentence.split(" ");
  if (chunks.length < 3) return sentence;
  const scrambled = chunks
    .map((word, index) => ({ word, index, rank: stableHash(`${key}:${index}:${word}`) }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(item => item.word);
  if (scrambled.join(" ") === sentence) scrambled.push(scrambled.shift() as string);
  return scrambled.join(" · ");
}

function drillLevel(drill: { level?: 1 | 2 | 3 }, index: number, total: number): 1 | 2 | 3 {
  if (drill.level) return drill.level;
  return index < Math.ceil(total / 3) ? 1 : index < Math.ceil((total * 2) / 3) ? 2 : 3;
}

function questionKey(topicId: string, drillId: string): string {
  return `${topicId}-${drillId}`;
}

const articleSwaps: Record<string, string[]> = {
  der: ["den", "dem", "die"], die: ["der", "den", "das"], das: ["dem", "den", "die"],
  den: ["der", "dem", "die"], dem: ["den", "der", "das"], des: ["dem", "der", "den"],
  ein: ["einen", "einem", "einer"], eine: ["einer", "einen", "einem"],
  einen: ["einem", "einer", "ein"], einem: ["einen", "einer", "ein"], einer: ["eine", "einen", "einem"],
  dein: ["deinen", "deinem", "deiner"], deine: ["deiner", "deinen", "deinem"],
  deinen: ["deinem", "deiner", "dein"], deinem: ["deinen", "deiner", "dein"], deiner: ["deine", "deinen", "deinem"],
  mein: ["meinen", "meinem", "meiner"], meine: ["meiner", "meinen", "meinem"],
  meinen: ["meinem", "meiner", "mein"], meinem: ["meinen", "meiner", "mein"], meiner: ["meine", "meinen", "meinem"],
  ihr: ["ihren", "ihrem", "ihrer"], ihre: ["ihrer", "ihren", "ihrem"],
  ihren: ["ihrem", "ihrer", "ihr"], ihrem: ["ihren", "ihrer", "ihr"], ihrer: ["ihre", "ihren", "ihrem"],
  unser: ["unseren", "unserem", "unserer"], unsere: ["unserer", "unseren", "unserem"],
  euer: ["euren", "eurem", "eurer"], eure: ["eurer", "euren", "eurem"],
};

/**
 * Build a sentence that is unambiguously wrong: change the case of a present
 * article, or duplicate a word when the sentence has no article. The original
 * wrong-option sentences are not reused because an alternative preposition or
 * conjunction can still be grammatical in a different reading.
 */
function corruptSentence(sentence: string, key: string, variant: number): string {
  const words = sentence.split(" ");
  for (let index = 0; index < words.length; index++) {
    const punctuation = words[index].match(/[.,!?;:]$/)?.[0] ?? "";
    const clean = words[index].slice(0, words[index].length - punctuation.length);
    const swaps = articleSwaps[clean.toLocaleLowerCase("de-DE")];
    if (!swaps) continue;
    const replacement = swaps[(stableHash(`${key}:${index}`) + variant) % swaps.length];
    if (replacement === clean) continue;
    words[index] = `${replacement}${punctuation}`;
    return words.join(" ");
  }
  const candidates = words
    .map((word, index) => ({ word, index }))
    .filter(({ word }) => /^[A-Za-zÄÖÜäöüß]{3,}$/.test(word));
  if (!candidates.length) return sentence;
  const copies: string[] = [];
  for (const candidate of candidates) {
    const duplicated = [...words];
    duplicated.splice(candidate.index, 0, duplicated[candidate.index]);
    copies.push(duplicated.join(" "));
  }
  // Short sentences may offer only two usable words; duplicate every word as a
  // third, still unambiguous error.
  copies.push(words.flatMap(word => [word, word]).join(" "));
  const pick = copies[(stableHash(key) + variant) % copies.length];
  return pick;
}

function buildSecondaryQuestion(topic: typeof germanB1DrillModules[number], drill: typeof topic.drills[number], level: 1 | 2 | 3, index: number, lessonSlot: 0 | 1): B1GrammarQuestion {
  const unitId = `unit${topic.number + 12}`;
  const answer = drill.options[drill.correct];
  const key = questionKey(topic.id, drill.id);
  const format = (["fill", "fix", "order"] as const)[index % 3];
  const sentence = fillPrompt(drill.prompt, answer);

  if (format === "fill") {
    return { id: `q-${topic.id}-m-${drill.id}`, unitId, prompt: drill.prompt, translationFa: drill.translation,
      options: [], correctIndex: -1, explanationFa: drill.why, format, level, lessonSlot, answer };
  }

  if (format === "fix") {
    const wrong = new Set<string>();
    for (let attempt = 0; wrong.size < 3 && attempt < 12; attempt++) {
      const candidate = corruptSentence(sentence, key, attempt);
      if (candidate !== sentence) wrong.add(candidate);
    }
    const prompt = corruptSentence(sentence, key, 20);
    const arranged = arrangeOptions([sentence, ...wrong], sentence, `fix-${key}`);
    return { id: `q-${topic.id}-m-${drill.id}`, unitId, prompt, translationFa: drill.translation,
      options: arranged.options, correctIndex: arranged.correctIndex, explanationFa: drill.why, format, level, lessonSlot, answer: sentence };
  }

  return { id: `q-${topic.id}-m-${drill.id}`, unitId, prompt: scrambleSentence(sentence, key), translationFa: drill.translation,
    options: [], correctIndex: -1, explanationFa: drill.why, format: "order", level, lessonSlot, answer: sentence };
}

function buildTopicQuestions(topic: typeof germanB1DrillModules[number]): B1GrammarQuestion[] {
  const unitId = `unit${topic.number + 12}`;
  const ordered = topic.drills.map((drill, index) => ({ drill, index, level: drillLevel(drill, index, topic.drills.length) }))
    .sort((left, right) => left.level - right.level || left.index - right.index);

  const slots = new Map(ordered.map((item, index) => [item.drill.id, index % 2 as 0 | 1]));
  const choiceFor = ({ drill, level }: typeof ordered[number]): B1GrammarQuestion => {
    const answer = drill.options[drill.correct];
    const arranged = arrangeOptions(drill.options, answer, `choice-${questionKey(topic.id, drill.id)}`);
    return { id: `q-${topic.id}-c-${drill.id}`, unitId, prompt: drill.prompt, translationFa: drill.translation,
      options: arranged.options, correctIndex: arranged.correctIndex, explanationFa: drill.why,
      format: "choice" as const, level, lessonSlot: slots.get(drill.id) as 0 | 1, answer };
  };
  const secondaryFor = new Map(ordered.map((item, index) => {
    const lessonSlot = (index + 1) % 2 as 0 | 1;
    return [item.drill.id, buildSecondaryQuestion(topic, item.drill, item.level, index, lessonSlot)];
  }));

  // Interleave recognition and production inside each difficulty band, taking the
  // production tasks from a different drill so consecutive questions never repeat.
  return [1, 2, 3].flatMap(level => {
    const group = ordered.filter(item => item.level === level);
    const choices = group.map(choiceFor);
    const productions = group.map(item => secondaryFor.get(item.drill.id) as B1GrammarQuestion);
    const offset = Math.ceil(group.length / 2);
    return group.flatMap((_, index) => [choices[index], productions[(index + offset) % group.length]]);
  });
}

export const b1GrammarQuestions: B1GrammarQuestion[] = germanB1DrillModules.flatMap(buildTopicQuestions);
