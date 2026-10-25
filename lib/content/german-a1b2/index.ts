import type { GrammarModule, GrammarQuestion } from "./types";
import { zuInfinitivBasics } from "./zu-infinitiv-basics.ts";
import { zuInfinitivDass } from "./zu-infinitiv-dass.ts";
import { zuInfinitivTrennbar } from "./zu-infinitiv-trennbar.ts";
import { zuInfinitivUmOhneStatt } from "./zu-infinitiv-um-ohne-statt.ts";
import { zuInfinitivAdvanced } from "./zu-infinitiv-advanced.ts";

const levelOrder = { A1: 0, A2: 1, B1: 2, B2: 3 } as const;

/** The lesson deliberately moves from recognition to transfer. */
export const zuInfinitivQuestions: GrammarQuestion[] = [
  ...zuInfinitivBasics,
  ...zuInfinitivDass,
  ...zuInfinitivTrennbar,
  ...zuInfinitivUmOhneStatt,
  ...zuInfinitivAdvanced,
].sort((left, right) => left.difficulty - right.difficulty || levelOrder[left.level] - levelOrder[right.level]);

export const grammarModules: GrammarModule[] = [
  { id: "wechselpraepositionen", number: 1, title: "Wechselpräpositionen", titleFa: "حروف اضافهٔ دوحالته", level: "A1–B1", status: "planned", questionCount: 0, summaryFa: "in, an, auf, unter, über, vor, hinter, neben, zwischen: Wo? oder Wohin?", skills: ["Dativ", "Akkusativ", "Position"] },
  { id: "dativ", number: 2, title: "Präpositionen mit Dativ", titleFa: "حروف اضافه با داتیو", level: "A1–B1", status: "planned", questionCount: 0, summaryFa: "mit, nach, aus, bei, von, zu, seit, gegenüber und die Dativformen.", skills: ["Dativ", "Präpositionen"] },
  { id: "akkusativ", number: 3, title: "Präpositionen mit Akkusativ", titleFa: "حروف اضافه با آکوزاتیو", level: "A1–B1", status: "planned", questionCount: 0, summaryFa: "durch, für, gegen, ohne, um, bis, entlang richtig einsetzen.", skills: ["Akkusativ", "Präpositionen"] },
  { id: "genitiv", number: 4, title: "Präpositionen mit Genitiv", titleFa: "حروف اضافه با گنیتیو", level: "B1–B2", status: "planned", questionCount: 0, summaryFa: "wegen, trotz, während, statt, innerhalb und weitere Genitivpräpositionen.", skills: ["Genitiv", "formeller Stil"] },
  { id: "dativ-akkusativ", number: 5, title: "Dativ oder Akkusativ?", titleFa: "داتیو یا آکوزاتیو؟", level: "A2–B1", status: "planned", questionCount: 0, summaryFa: "Kasus aus der Satzrolle bestimmen, nicht aus einer Wortliste raten.", skills: ["Kasusanalyse", "Pronomen"] },
  { id: "verben-praepositionen", number: 6, title: "Verben mit festen Präpositionen", titleFa: "افعال با حرف اضافهٔ ثابت", level: "B1–B2", status: "planned", questionCount: 0, summaryFa: "warten auf, sich interessieren für, teilnehmen an und ihre Kasus.", skills: ["Kollokationen", "Präpositionalobjekt"] },
  { id: "verben-dativ-akkusativ", number: 7, title: "Verben mit Dativ und Akkusativ", titleFa: "افعال با داتیو و آکوزاتیو", level: "A2–B1", status: "planned", questionCount: 0, summaryFa: "geben, zeigen, erklären: Person im Dativ, Sache im Akkusativ.", skills: ["Satzbau", "Pronomen"] },
  { id: "modalverben", number: 8, title: "Modalverben", titleFa: "افعال مُدال", level: "A1–B1", status: "planned", questionCount: 0, summaryFa: "können, müssen, dürfen, sollen, wollen, mögen und möchten.", skills: ["Modalität", "Infinitiv ohne zu"] },
  { id: "infinitiv-zu", number: 9, title: "Infinitiv mit zu", titleFa: "مصدر با zu", level: "A2–B2", status: "ready", questionCount: zuInfinitivQuestions.length, summaryFa: "zu + Infinitiv, dass-Sätze, trennbare Verben, um/ohne/statt und Infinitiv Perfekt.", skills: ["zu + Infinitiv", "dass-Satz", "trennbare Verben", "Infinitiv Perfekt"] },
  { id: "trennbare-verben", number: 10, title: "Trennbare und untrennbare Verben", titleFa: "افعال جداشدنی و جدانشدنی", level: "A2–B1", status: "planned", questionCount: 0, summaryFa: "Präfixe, Satzklammer, Partizip II und die Stelle von zu.", skills: ["Wortbildung", "Satzklammer"] },
  { id: "nebensaetze", number: 11, title: "Nebensätze", titleFa: "جمله‌های فرعی", level: "A2–B2", status: "planned", questionCount: 0, summaryFa: "dass, weil, obwohl, wenn, als, bevor, nachdem, während und damit.", skills: ["Verbstellung", "Konnektoren"] },
  { id: "dass-vs-zu", number: 12, title: "dass-Satz oder zu-Infinitiv?", titleFa: "جملهٔ dass یا مصدر با zu؟", level: "B1–B2", status: "planned", questionCount: 0, summaryFa: "Subjektvergleich, Zeitverhältnis und die passende Kurzform wählen.", skills: ["Subjekt", "Reduktion"] },
  { id: "um-ohne-statt", number: 13, title: "um, ohne und statt mit zu", titleFa: "um، ohne و statt با zu", level: "B1–B2", status: "planned", questionCount: 0, summaryFa: "Zweck, fehlende Begleithandlung und Ersatz präzise ausdrücken.", skills: ["Zweck", "Negation", "Ersatz"] },
  { id: "relativsaetze", number: 14, title: "Relativsätze", titleFa: "جمله‌های موصولی", level: "B1–B2", status: "planned", questionCount: 0, summaryFa: "der, die, das, dessen, deren und die Kasus im Relativsatz.", skills: ["Relativpronomen", "Kasus"] },
  { id: "zeiten", number: 15, title: "Zeitformen", titleFa: "زمان‌های فعل", level: "A1–B2", status: "planned", questionCount: 0, summaryFa: "Präsens, Perfekt, Präteritum, Plusquamperfekt und Futur.", skills: ["Tempus", "Vorzeitigkeit"] },
  { id: "adjektive", number: 16, title: "Adjektivdeklination", titleFa: "صرف صفت", level: "A2–B2", status: "planned", questionCount: 0, summaryFa: "Endungen nach bestimmtem, unbestimmtem und ohne Artikel.", skills: ["Deklination", "Artikelwörter"] },
  { id: "passiv", number: 17, title: "Passiv", titleFa: "مجهول", level: "B1–B2", status: "planned", questionCount: 0, summaryFa: "werden + Partizip II, Passiv mit Modalverben und by-Angaben.", skills: ["Passiv", "Partizip II"] },
  { id: "konjunktiv", number: 18, title: "Konjunktiv II", titleFa: "حالت فرضی", level: "B1–B2", status: "planned", questionCount: 0, summaryFa: "würde, hätte, wäre, könnte und höfliche Formulierungen.", skills: ["Irrealis", "Höflichkeit"] },
  { id: "satzstellung", number: 19, title: "Satzstellung und Satzklammer", titleFa: "ترتیب کلمات و کمان جمله", level: "A2–B2", status: "planned", questionCount: 0, summaryFa: "Position des finiten Verbs, TeKaMoLo und die Satzklammer.", skills: ["Wortstellung", "Satzbau"] },
  { id: "komplexe-saetze", number: 20, title: "Komplexe B1-/B2-Sätze", titleFa: "جمله‌های پیچیدهٔ B1/B2", level: "B1–B2", status: "planned", questionCount: 0, summaryFa: "Mehrere Nebensätze, Partizipialgruppen und schriftlicher Stil.", skills: ["Syntax", "Stil"] },
];

export const zuInfinitivModule = grammarModules.find((module) => module.id === "infinitiv-zu")!;

export function getModule(id: string): GrammarModule | undefined {
  return grammarModules.find((module) => module.id === id);
}

export function questionsForModule(id: string): GrammarQuestion[] {
  return id === "infinitiv-zu" ? zuInfinitivQuestions : [];
}

export const zuInfinitivLesson = {
  introDe: "Der Infinitiv mit „zu“ macht aus einem Nebensatz eine kompakte Ergänzung. Entscheidend sind das Subjekt, die Zeitstufe und die Frage, ob das Verb trennbar ist.",
  introFa: "مصدر با zu جمله را کوتاه می‌کند، اما فقط وقتی فاعل هر دو بخش یکی است. سه چیز را همیشه بررسی کن: فاعل، زمان و جداشدنی بودن فعل.",
  sections: [
    {
      titleDe: "Gleiches Subjekt, ein Infinitiv",
      titleFa: "فاعل یکی، یک مصدر",
      bodyDe: "Wenn die Person im Hauptsatz die Handlung selbst ausführt, wird aus „dass ich …“ die Form „zu + Infinitiv“.",
      bodyFa: "اگر همان فاعل جملهٔ اصلی کار را انجام می‌دهد، به‌جای dass-Satz از zu + مصدر استفاده کن.",
      examples: ["Ich hoffe, die Prüfung zu bestehen.", "Sie versucht, früher anzufangen."],
    },
    {
      titleDe: "Anderes Subjekt, dass-Satz",
      titleFa: "فاعل متفاوت، جملهٔ dass",
      bodyDe: "Sobald eine andere Person handelt oder ausdrücklich genannt wird, braucht der Satz ein finites Verb. Dann ist der dass-Satz die sichere Form.",
      bodyFa: "اگر شخص دیگری کار را انجام می‌دهد یا فاعل را جداگانه می‌گویی، جمله به فعل صرف‌شده نیاز دارد؛ اینجا dass-Satz درست است.",
      examples: ["Ich hoffe, dass du die Prüfung bestehst.", "Sie möchte, dass wir mitkommen."],
    },
    {
      titleDe: "Trennbare Verben",
      titleFa: "افعال جداشدنی",
      bodyDe: "Bei trennbaren Verben steht „zu“ zwischen Präfix und Stamm: anrufen → anzurufen, aufstehen → aufzustehen.",
      bodyFa: "در افعال جداشدنی، zu بین پیشوند و ریشه می‌آید: anrufen → anzurufen.",
      examples: ["Ich versuche, dich anzurufen.", "Vergiss nicht, früh aufzustehen."],
    },
    {
      titleDe: "Zweck, Verzicht und Ersatz",
      titleFa: "هدف، بدون انجام کار و جایگزینی",
      bodyDe: "„um … zu“ nennt einen Zweck, „ohne … zu“ eine nicht ausgeführte Begleitung, „statt … zu“ eine ersetzte Handlung. Alle drei brauchen dasselbe Subjekt.",
      bodyFa: "um … zu هدف را می‌گوید، ohne … zu کاری که انجام نشد، و statt … zu کاری که جایگزین شد. در هر سه، فاعل باید یکی باشد.",
      examples: ["Ich lerne, um die Prüfung zu bestehen.", "Er ging, ohne sich zu verabschieden.", "Statt zu warten, nahm sie ein Taxi."],
    },
    {
      titleDe: "Vorzeitigkeit und Passiv",
      titleFa: "گذشتهٔ پیشین و مجهول",
      bodyDe: "Für eine frühere Handlung steht der Infinitiv Perfekt: Partizip II + zu haben. Für einen Vorgang steht der Passiv-Infinitiv: Partizip II + zu werden/sein.",
      bodyFa: "برای کاری که قبل‌تر انجام شده: Partizip II + zu haben. برای مجهول: Partizip II + zu werden/sein.",
      examples: ["Ich bedauere, nicht geholfen zu haben.", "Die Aufgabe scheint gelöst zu sein."],
    },
  ],
};

export const zuInfinitivWritingTasks = [
  { id: "w1", promptFa: "بنویس که امیدوار هستی در آزمون B1 قبول شوی.", model: "Ich hoffe, die B1-Prüfung zu bestehen.", checklist: ["فاعل هر دو بخش یکی است", "zu + مصدر در پایان", "حروف بزرگ اسم‌ها"] },
  { id: "w2", promptFa: "بنویس که تصمیم گرفته‌ای هر روز بیست دقیقه آلمانی تمرین کنی.", model: "Ich habe beschlossen, jeden Tag zwanzig Minuten Deutsch zu üben.", checklist: ["beschließen + zu", "زمان و مقدار", "فعل در پایان"] },
  { id: "w3", promptFa: "از یک دوست بخواه فردا زودتر بیدار شود.", model: "Ich bitte dich, morgen früher aufzustehen.", checklist: ["bitten + مفعول", "aufzustehen با zu در وسط", "لحن مؤدبانه"] },
  { id: "w4", promptFa: "توضیح بده چرا آلمانی می‌خوانی؛ از um … zu استفاده کن.", model: "Ich lerne Deutsch, um in Deutschland zu arbeiten.", checklist: ["um … zu", "هدف روشن", "فاعل یکی"] },
  { id: "w5", promptFa: "بنویس که بدون خداحافظی از مهمانی رفتی.", model: "Ich ging von der Party, ohne mich zu verabschieden.", checklist: ["ohne … zu", "ضمیر بازتابی", "فعل در پایان"] },
  { id: "w6", promptFa: "بنویس که به‌جای تلویزیون تماشا کردن، کتاب خواندی.", model: "Statt fernzusehen, las ich ein Buch.", checklist: ["statt … zu", "fernzusehen", "زمان گذشته"] },
];

export const zuInfinitivDictation = [
  "Ich hoffe, dich bald wiederzusehen.",
  "Sie versucht, den letzten Bus zu erreichen.",
  "Vergiss nicht, die Tür abzuschließen.",
  "Wir lernen Deutsch, um die Prüfung zu bestehen.",
  "Er ging, ohne sich zu verabschieden.",
  "Es ist wichtig, regelmäßig zu üben.",
];
