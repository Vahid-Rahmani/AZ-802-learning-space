import { questions } from "./questions";

export type TrilingualText = { fa: string; en: string; de: string };

export const trainingStages = [
  { id: "ad-ds", stage: 1, domain: "Deploy and manage AD DS", skillId: "security", lessonId: "ad-ds", title: { fa: "استقرار و مدیریت AD DS", en: "Deploy and manage AD DS", de: "AD DS bereitstellen und verwalten" }, body: { fa: "نقش‌های FSMO، replication، RODC، گروه‌ها و سلامت Domain Controller را مرحله‌به‌مرحله تمرین کنید.", en: "Practice FSMO roles, replication, RODC, groups, and domain-controller health step by step.", de: "FSMO-Rollen, Replikation, RODC, Gruppen und Domänencontroller-Zustand Schritt für Schritt üben." }, objective: { fa: "یک پایهٔ سالم و قابل عیب‌یابی برای هویت سازمان بسازید.", en: "Build a healthy, diagnosable identity foundation.", de: "Eine gesunde und diagnostizierbare Identitätsbasis aufbauen." }, source: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-802" },
  { id: "hybrid", stage: 2, domain: "Manage Windows Server instances and workloads in a hybrid environment", skillId: "migration", lessonId: "hybrid-windows-server", title: { fa: "مدیریت Hybrid Windows Server", en: "Manage hybrid Windows Server workloads", de: "Hybride Windows-Server-Workloads verwalten" }, body: { fa: "Azure Arc، مدیریت policy و اتصال امن سرورهای on-premises را تمرین کنید.", en: "Practice Azure Arc, policy management, and secure connectivity for on-premises servers.", de: "Azure Arc, Richtlinienverwaltung und sichere Konnektivität für lokale Server üben." }, objective: { fa: "مدیریت یکپارچهٔ سرورهای محلی و ابری را طراحی کنید.", en: "Design unified management for on-premises and cloud servers.", de: "Eine einheitliche Verwaltung lokaler und cloudbasierter Server entwerfen." }, source: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-802" },
  { id: "virtual-machines", stage: 3, domain: "Manage virtual machines", skillId: "migration", lessonId: "virtual-machines", title: { fa: "مدیریت ماشین‌های مجازی", en: "Manage virtual machines", de: "Virtuelle Computer verwalten" }, body: { fa: "شبکهٔ Hyper-V، دیسک، checkpoint، replication و ظرفیت VM را تمرین کنید.", en: "Practice Hyper-V networking, disks, checkpoints, replication, and VM capacity.", de: "Hyper-V-Netzwerke, Datenträger, Checkpoints, Replikation und VM-Kapazität üben." }, objective: { fa: "یک VM قابل اتکا و قابل بازیابی را طراحی و عیب‌یابی کنید.", en: "Design and troubleshoot a reliable, recoverable VM.", de: "Eine zuverlässige und wiederherstellbare VM entwerfen und Fehler beheben." }, source: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-802" },
  { id: "networking", stage: 4, domain: "Implement and manage on-premises and hybrid networking", skillId: "security", lessonId: "hybrid-networking", title: { fa: "پیاده‌سازی شبکهٔ on-premises و hybrid", en: "Implement on-premises and hybrid networking", de: "Lokale und hybride Netzwerke implementieren" }, body: { fa: "DNS، DHCP، routing، VPN و امنیت ارتباطات Windows Server را تمرین کنید.", en: "Practice DNS, DHCP, routing, VPN, and Windows Server communication security.", de: "DNS, DHCP, Routing, VPN und Kommunikationssicherheit von Windows Server üben." }, objective: { fa: "اتصال پایدار و امن بین شبکه‌های محلی و ابری بسازید.", en: "Build stable and secure connectivity across local and cloud networks.", de: "Stabile und sichere Verbindungen zwischen lokalen und Cloudnetzwerken aufbauen." }, source: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-802" },
  { id: "storage", stage: 5, domain: "Manage storage and file services", skillId: "migration", lessonId: "storage", title: { fa: "مدیریت Storage و File Services", en: "Manage storage and file services", de: "Speicher- und Dateidienste verwalten" }, body: { fa: "Storage Spaces، SMB، DFS، quota و دسترسی مؤثر را از طراحی تا عیب‌یابی تمرین کنید.", en: "Practice Storage Spaces, SMB, DFS, quotas, and effective access from design to troubleshooting.", de: "Storage Spaces, SMB, DFS, Kontingente und effektive Berechtigungen üben." }, objective: { fa: "سرویس فایل قابل مهاجرت و قابل کنترل بسازید.", en: "Build a controllable and migratable file service.", de: "Einen kontrollierbaren und migrierbaren Dateidienst aufbauen." }, source: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-802" },
  { id: "security", stage: 6, domain: "Secure Windows Server infrastructure", skillId: "security", lessonId: "network-security", title: { fa: "امن‌سازی زیرساخت Windows Server", en: "Secure Windows Server infrastructure", de: "Windows-Server-Infrastruktur absichern" }, body: { fa: "Firewall، IPsec، hardening، credential protection و policy را در سناریوهای واقعی تمرین کنید.", en: "Practice firewall, IPsec, hardening, credential protection, and policy in realistic scenarios.", de: "Firewall, IPsec, Härtung, Anmeldeschutz und Richtlinien in realistischen Szenarien üben." }, objective: { fa: "سطح حمله را کم و کنترل‌های امنیتی را قابل اثبات کنید.", en: "Reduce the attack surface and prove security controls.", de: "Die Angriffsfläche reduzieren und Sicherheitskontrollen nachweisen." }, source: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-802" },
  { id: "monitoring", stage: 7, domain: "Monitor and troubleshoot Windows Server environments", skillId: "monitoring", lessonId: "monitoring", title: { fa: "مانیتورینگ و عیب‌یابی", en: "Monitor and troubleshoot Windows Server", de: "Windows Server überwachen und Fehler beheben" }, body: { fa: "Event، performance، Azure Monitor و روش تغییر کنترل‌شده را تمرین کنید.", en: "Practice events, performance, Azure Monitor, and controlled-change troubleshooting.", de: "Ereignisse, Leistung, Azure Monitor und Fehlerbehebung mit kontrollierten Änderungen üben." }, objective: { fa: "از شواهد قابل تکرار به علت ریشه‌ای برسید.", en: "Move from reproducible evidence to root cause.", de: "Von reproduzierbaren Nachweisen zur Grundursache gelangen." }, source: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-802" },
  { id: "recovery", stage: 8, domain: "Backup, recovery, high availability, and migration crossover", skillId: "dr", lessonId: "backup", title: { fa: "Backup، Recovery، HA و Migration", en: "Backup, recovery, HA, and migration", de: "Backup, Recovery, HA und Migration" }, body: { fa: "RPO، RTO، restore، quorum، failover و migration را در یک مسیر عملی جمع‌بندی کنید.", en: "Bring RPO, RTO, restore, quorum, failover, and migration together in one practical path.", de: "RPO, RTO, Wiederherstellung, Quorum, Failover und Migration praktisch verbinden." }, objective: { fa: "یک طرح بازیابی و مهاجرت قابل آزمون تحویل دهید.", en: "Deliver a testable recovery and migration plan.", de: "Einen testbaren Recovery- und Migrationsplan erstellen." }, source: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-802" },
].map((stage) => ({
  ...stage,
  ...(stage.id === "recovery" ? {
    title: { fa: "Capstone: بازیابی، دسترس‌پذیری و مهاجرت", en: "Capstone: recovery, high availability, and migration", de: "Capstone: Recovery, Hochverfügbarkeit und Migration" },
    body: { fa: "دانش هفت دامنه را در یک سناریوی کامل طراحی، اجرا و مستندسازی کنید.", en: "Bring the seven assessed domains together in one design, implementation, and evidence scenario.", de: "Die sieben geprüften Domänen in einem vollständigen Design-, Umsetzungs- und Nachweisszenario verbinden." },
    objective: { fa: "یک طرح قابل آزمون برای backup، recovery، HA و migration تحویل دهید.", en: "Deliver a testable plan for backup, recovery, high availability, and migration.", de: "Einen testbaren Plan für Backup, Recovery, Hochverfügbarkeit und Migration liefern." },
  } : {}),
  questionIds: questions.filter((question) => question.domain === stage.domain).map((question) => question.id),
}));

/**
 * The learner-facing graph keeps the seven assessed domains linear and adds a
 * final capstone. The existing `trainingStages` shape remains intact for
 * progress and legacy links; the capstone reuses the crossover question set
 * from stage 8 without creating a second copy of the content.
 */
export const learningGraphStages = [
  ...trainingStages.slice(0, 7),
  {
    ...trainingStages[7],
    id: "capstone",
    title: {
      fa: "Capstone: بازیابی، دسترس‌پذیری و مهاجرت",
      en: "Capstone: recovery, high availability, and migration",
      de: "Capstone: Recovery, Hochverfügbarkeit und Migration",
    },
    body: {
      fa: "دانش هفت دامنه را در یک سناریوی کامل طراحی، اجرا و مستندسازی کنید.",
      en: "Bring the seven assessed domains together in one design, implementation, and evidence scenario.",
      de: "Die sieben geprüften Domänen in einem vollständigen Design-, Umsetzungs- und Nachweisszenario verbinden.",
    },
    objective: {
      fa: "یک طرح قابل آزمون برای backup، recovery، HA و migration تحویل دهید.",
      en: "Deliver a testable plan for backup, recovery, high availability, and migration.",
      de: "Einen testbaren Plan für Backup, Recovery, Hochverfügbarkeit und Migration liefern.",
    },
  },
].map((stage) => ({
  ...stage,
  skillIds: Array.from(new Set(stage.questionIds.map((questionId) => questions.find((question) => question.id === questionId)?.skillId).filter((skillId): skillId is string => Boolean(skillId)))),
}));

export const trainingStageForQuestion = (questionId: string) => trainingStages.find((stage) => stage.questionIds.includes(questionId));
