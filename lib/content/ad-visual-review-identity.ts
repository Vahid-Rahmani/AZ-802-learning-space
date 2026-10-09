import type { Question } from "./questions";

const learn = "https://learn.microsoft.com/en-us/";
const roles = `${learn}windows-server/identity/ad-ds/manage/understand-fsmo-roles`;
const placement = `${learn}troubleshoot/windows-server/active-directory/fsmo-placement-and-optimization-on-ad-dcs`;
const move = `${learn}troubleshoot/windows-server/active-directory/transfer-or-seize-operation-master-roles-in-ad-ds`;
const groups = `${learn}windows-server/identity/ad-ds/manage/understand-security-groups`;
const msa = `${learn}windows-server/identity/ad-ds/manage/group-managed-service-accounts/group-managed-service-accounts/group-managed-service-accounts-overview`;
const serviceAccounts = `${learn}windows-server/identity/ad-ds/manage/understand-service-accounts`;
const secure = `${learn}powershell/module/microsoft.powershell.management/test-computersecurechannel?view=powershell-5.1`;
const trust = `${learn}troubleshoot/windows-server/windows-security/broken-trust-relationship-domain-joined-device-its-domain-secure-channel-issues`;
const application = `${learn}windows/win32/ad/about-application-directory-partitions`;
const names = `${learn}windows/win32/ad/naming-properties`;
const identifiers = `${learn}windows-server/identity/ad-ds/manage/understand-security-identifiers`;
const ps = (name: string) => `${learn}powershell/module/activedirectory/${name}?view=windowsserver2025-ps`;
const r = (en: string, fa: string, de: string): Question["rationale"] => ({ en, fa, de });

// Read from all 14 original rows: these three flags were already true.
// Preserve those prior statuses; this review newly verifies technical answers
// and Microsoft sources, not originality, translation or a complete distractor audit.
const priorAuditFlags = {
  originalityVerified: true, translationVerified: true, distractorsReviewed: true,
};
const corrected = (sourceRefs: string[], patch: Partial<Question>): Partial<Question> => ({
  ...patch, sourceRefs,
  audit: {
    sourceRefs, sourceVerified: true, answerVerified: true,
    ...priorAuditFlags,
    reviewer: "Official Microsoft technical and guide review for Windows Server 2025; prior originality, translation and distractor audit statuses retained",
    reviewedAt: "2026-10-09T19:11:36.000Z",
  },
});

/** Authored row patches; only the coordinating task applies them to the bank. */
export const identityQuestionCorrections: Record<string, Partial<Question>> = {
  "az802-q-003": corrected([roles, placement], {
    requirements: "For Windows Server 2025 AD DS, the Domain Naming Master must be available for forest namespace changes. It does not have to be a global catalog server; that requirement applied to Windows 2000. Verify replication and deliberate role placement before changing ownership.",
    rationale: r("Domain Naming Master manages forest domain additions and removals. Windows Server 2025 does not require its holder to be a global catalog.", "Domain Naming Master افزودن و حذف دامین‌های جنگل را مدیریت می‌کند. در Windows Server 2025 لازم نیست دارندهٔ این نقش سرور Global Catalog باشد.", "Der Domain Naming Master verwaltet das Hinzufügen und Entfernen von Domänen im Forest. Unter Windows Server 2025 muss sein Besitzer kein Global Catalog sein."),
  }),
  "az802-q-004": corrected([roles, `${learn}windows-server/networking/windows-time-service/windows-time-service-tools-and-settings`], {
    commandPath: [
      { label: "Read the domain PDC Emulator", command: "Get-ADDomain | Select-Object PDCEmulator" },
      { label: "Read this computer's configured time source (not necessarily the PDC)", command: "w32tm /query /source" },
    ],
    rationale: r("The PDC Emulator receives preferential password updates and helps other controllers check recently changed passwords.", "PDC Emulator به‌روزرسانی‌های رمز عبور را با اولویت دریافت می‌کند و به کنترل‌کننده‌های دیگر برای بررسی رمزهای تازه‌تغییریافته کمک می‌کند.", "Der PDC-Emulator erhält Kennwortänderungen bevorzugt und hilft anderen Domänencontrollern, kürzlich geänderte Kennwörter zu prüfen."),
  }),
  "az802-q-005": corrected([roles, placement, move], {
    requirements: "For Windows Server 2025 AD DS, the Infrastructure Master maintains cross-domain references where that work is needed. It can be on any DC if all domain DCs are global catalogs or AD Recycle Bin is enabled. Otherwise, in a multidomain forest, place it on a non-GC DC. A single-domain forest has no cross-domain reference maintenance to perform.",
    rationale: r("Infrastructure Master maintains references to objects in other domains. With all DCs acting as GCs or Recycle Bin enabled, that maintenance does not require this role.", "Infrastructure Master ارجاع به اشیای دامین‌های دیگر را نگه‌داری می‌کند. اگر همهٔ DCها نقش GC داشته باشند یا Recycle Bin فعال باشد، این نگه‌داری به این نقش نیاز ندارد.", "Der Infrastructure Master pflegt Verweise auf Objekte anderer Domänen. Sind alle DCs Global Catalogs oder ist der Papierkorb aktiviert, ist diese Pflege nicht auf die Rolle angewiesen."),
  }),
  "az802-q-008": corrected([move, ps("move-addirectoryserveroperationmasterrole")], {
    keyPoints: [
      "Seizure is recovery when a role cannot be transferred and the previous holder is permanently unavailable in this scenario.",
      "Move-ADDirectoryServerOperationMasterRole with -Force attempts a graceful transfer first and seizes only if transfer fails.",
      "Before reusing a former holder as a DC, rebuild it or forcibly demote it and clean up its metadata; do not reconnect its original DC state as a recovery shortcut.",
    ],
    requirements: "For Windows Server 2025 AD DS, choose a healthy writable DC with an up-to-date role partition. Use appropriate Enterprise Admin rights for forest roles or Domain Admin rights for domain roles. Verify ownership and replication afterwards. Seizing RID Master consumes additional RIDs, so it is not a routine transfer technique.",
    commandPath: [
      { label: "Preview Schema Master seizure for a permanently failed forest-role holder", command: "Move-ADDirectoryServerOperationMasterRole -Identity DC02 -OperationMasterRole SchemaMaster -Force -WhatIf" },
      { label: "Verify current forest-role owners", command: "Get-ADForest | Select-Object SchemaMaster, DomainNamingMaster" },
    ],
    rationale: r("Seize the role when the failed holder cannot transfer it. Clean up the former controller before reusing it.", "وقتی دارندهٔ خراب نقش نمی‌تواند آن را منتقل کند، نقش را تصاحب کنید. پیش از استفادهٔ دوباره، کنترل‌کنندهٔ قبلی را پاک‌سازی کنید.", "Übernehmen Sie die Rolle zwangsweise, wenn der ausgefallene Besitzer sie nicht übertragen kann. Bereinigen Sie den früheren Controller vor seiner Wiederverwendung."),
  }),
  "az802-q-009": corrected([move, ps("move-addirectoryserveroperationmasterrole")], {
    whyOthers: [
      "SYSVOL repair uses its own replication and recovery procedures; a role transfer does not rebuild SYSVOL.",
      "Promoting a member server as an RODC is a deployment operation, not a graceful handoff of an existing FSMO role.",
      "Raising a domain functional level changes supported directory behavior; transferring a role only changes its owner.", "",
    ],
    requirements: "For Windows Server 2025 AD DS, use the ActiveDirectory PowerShell module or the GUI tool for the specific role. The current owner must be reachable and the destination must be an appropriate writable DC. Use Domain Admin rights for domain roles or Enterprise Admin rights for forest roles. Preview a planned move with -WhatIf.",
    commandPath: [
      { label: "Preview a graceful RID Master transfer to DC02", command: "Move-ADDirectoryServerOperationMasterRole -Identity DC02 -OperationMasterRole RIDMaster -WhatIf" },
      { label: "Verify domain-wide role owners", command: "Get-ADDomain | Select-Object RIDMaster, PDCEmulator, InfrastructureMaster" },
    ],
    rationale: r("Transfer gracefully changes ownership while the current role holder is reachable; seizure is a separate recovery path.", "انتقال عادی، وقتی دارندهٔ فعلی نقش در دسترس است، مالکیت را هماهنگ تغییر می‌دهد؛ تصاحب نقش مسیر جداگانهٔ بازیابی است.", "Eine Übertragung wechselt den Besitzer geordnet, solange der bisherige Rolleninhaber erreichbar ist; eine erzwungene Übernahme dient der Wiederherstellung."),
  }),
  "az802-q-018": corrected([groups], {
    requirements: "For Windows Server 2025 AD DS, a Global group can convert to Universal if it is not a member of another Global group. This restriction concerns membership in other groups, not whether the group contains a Global group. Review all scope-conversion constraints before changing scope.",
    rationale: r("Global groups collect accounts from their own domain and commonly represent a department or job role.", "گروه‌های Global حساب‌های دامین خود را جمع می‌کنند و معمولاً یک بخش یا نقش شغلی را نشان می‌دهند.", "Globale Gruppen fassen Konten ihrer eigenen Domäne zusammen und bilden typischerweise eine Abteilung oder berufliche Rolle ab."),
  }),
  "az802-q-020": corrected([groups], {
    text: "In the AGDLP model, what does the final DLP represent?",
    textFa: "در مدل AGDLP، بخش پایانی DLP چه مفهومی دارد؟",
    options: ["Local users and passwords", "Domain Local groups assigned Permissions", "LDAP providers", "Logon policies"],
    optionsFa: ["کاربران محلی و رمزهای عبور", "گروه‌های Domain Local که مجوزها به آن‌ها اختصاص می‌یابند", "ارائه‌دهندگان LDAP", "سیاست‌های ورود"], correct: 1,
    requirements: "For Windows Server 2025 AD DS, use eligible security-group nesting. Domain Local resource groups can contain Global groups from trusted domains, so crossing a domain does not automatically require a Universal group. Universal groups can aggregate roles across domains when that extra layer is appropriate.",
    rationale: r("AGDLP places Accounts in Global groups, then Domain Local groups, to which resource Permissions are assigned.", "در AGDLP، حساب‌ها عضو گروه‌های Global می‌شوند، این گروه‌ها در گروه‌های Domain Local قرار می‌گیرند و مجوزهای منابع به گروه‌های Domain Local داده می‌شود.", "Bei AGDLP werden Konten in globale Gruppen und diese in domänenlokale Gruppen aufgenommen; die Ressource weist den domänenlokalen Gruppen Berechtigungen zu."),
  }),
  "az802-q-022": corrected([msa, serviceAccounts, ps("new-adserviceaccount"), `${learn}windows-server/security/group-managed-service-accounts/create-the-key-distribution-services-kds-root-key`], {
    keyPoints: [
      "Windows manages a gMSA password; domain controllers compute it and authorized hosts retrieve it automatically.",
      "One gMSA can support a compatible service on multiple authorized computers.",
      "The default password rotation interval is 30 days; a different interval is selected at account creation. Password retrieval is controlled separately from application resource permissions.",
    ],
    requirements: "For Windows Server 2025 AD DS, verify gMSA application support, suitable DCs and an existing replicated KDS root key. If a key is first created, allow the documented replication delay of up to ten hours; do not backdate a key in production. Limit PrincipalsAllowedToRetrieveManagedPassword to the intended hosts.",
    whyOthers: [
      "Guest provides neither managed service passwords nor a shared managed identity for authorized hosts.",
      "A temporary profile is a profile-loading fallback, not a service-account type.",
      "A standard local user does not provide AD-managed password rotation and a shared domain service identity across authorized hosts.", "",
    ],
    rationale: r("A gMSA lets Windows manage the password for a compatible service running on multiple authorized hosts.", "gMSA به ویندوز اجازه می‌دهد رمز عبور سرویس سازگاری را که روی چند میزبان مجاز اجرا می‌شود مدیریت کند.", "Mit einem gMSA verwaltet Windows das Kennwort eines kompatiblen Dienstes, der auf mehreren berechtigten Hosts läuft."),
  }),
  "az802-q-023": corrected([msa, ps("new-adserviceaccount"), ps("add-adcomputerserviceaccount"), ps("install-adserviceaccount"), ps("test-adserviceaccount")], {
    text: "A service runs on one server and supports sMSAs but cannot use a gMSA. Which account is preferable to a manually managed domain user?",
    textFa: "سرویسی روی یک سرور اجرا می‌شود و از sMSA پشتیبانی می‌کند، اما نمی‌تواند از gMSA استفاده کند. کدام حساب نسبت به کاربر دامین با مدیریت دستی رمز عبور مناسب‌تر است؟",
    keyPoints: [
      "An sMSA supplies Windows-managed credentials to a compatible service on a single computer.",
      "The application must support sMSAs; lack of gMSA support alone does not prove this.",
      "Create the account with -RestrictToSingleComputer, associate its computer, then install and test it on that host.",
    ],
    requirements: "For Windows Server 2025 AD DS, verify sMSA support and associate the account with its one intended computer. -ManagedPasswordIntervalInDays is not part of New-ADServiceAccount's RestrictToSingleComputer parameter set. Run installation on the associated host.",
    commandPath: [
      { label: "Preview standalone managed service-account creation", command: "New-ADServiceAccount -Name svc-legacy -RestrictToSingleComputer -WhatIf" },
      { label: "After account creation, preview association with APP01", command: "Add-ADComputerServiceAccount -Identity APP01 -ServiceAccount svc-legacy -WhatIf" },
      { label: "After provisioning and association, install and test locally on APP01", command: "Install-ADServiceAccount -Identity svc-legacy\nTest-ADServiceAccount -Identity svc-legacy" },
    ],
    whyOthers: [
      "Built-in Administrator grants broad privileges and does not provide a dedicated managed service identity.",
      "Local System is highly privileged locally and uses the computer identity on the network; it is not the dedicated sMSA described here.", "",
      "Guest does not supply automatically managed service credentials.",
    ],
    rationale: r("An sMSA provides managed credentials on one computer when the service supports that account type.", "اگر سرویس از این نوع حساب پشتیبانی کند، sMSA اعتبارنامه‌های مدیریت‌شده را روی یک رایانه فراهم می‌کند.", "Ein sMSA stellt auf einem Computer verwaltete Anmeldedaten bereit, wenn der Dienst diesen Kontotyp unterstützt."),
  }),
  "az802-q-027": corrected([trust], {
    keyPoints: [
      "An AD computer account provides a domain member's machine identity and the password used for its Netlogon secure channel.",
      "A mismatch between local and AD machine-account secrets, an absent account or an unavailable DC can prevent machine authentication.",
      "Cached interactive user sign-in may still succeed during a trust or connectivity failure; it does not prove machine trust is healthy.",
    ],
    rationale: r("The AD computer account supplies the machine's domain identity and the secret used to establish its secure channel.", "حساب رایانه در AD هویت دامین دستگاه و راز موردنیاز برای برقراری کانال امن آن را فراهم می‌کند.", "Das AD-Computerkonto stellt die Domänenidentität des Geräts und das Geheimnis für seinen sicheren Kanal bereit."),
  }),
  "az802-q-028": corrected([secure, trust], {
    text: "Which command tests whether a domain member computer's secure channel is healthy?",
    textFa: "کدام دستور سالم بودن کانال امن رایانهٔ عضو دامین را آزمایش می‌کند؟",
    keyPoints: [
      "Test-ComputerSecureChannel checks the local domain member's trust and returns True or False.",
      "The -Repair option can restore a broken channel with a credential authorized to reset that computer account.",
      "This cmdlet is for domain members, not domain controllers; on a DC it can report misleading errors. Use the documented netdom or nltest DC procedure.",
    ],
    requirements: "For Windows Server 2025 member servers and domain-joined Windows clients, run locally with appropriate administrator access. Confirm internal DNS/DC connectivity. The repairing domain credential must be authorized for the computer account. This cmdlet is not a DC secure-channel diagnostic.",
    rationale: r("Test-ComputerSecureChannel checks trust on the local domain member; it is not suitable for checking a domain controller.", "Test-ComputerSecureChannel اعتماد رایانهٔ محلی عضو دامین را بررسی می‌کند؛ برای بررسی کنترل‌کنندهٔ دامین مناسب نیست.", "Test-ComputerSecureChannel prüft das Vertrauen des lokalen Domänenmitglieds; für die Prüfung eines Domänencontrollers ist das Cmdlet ungeeignet."),
  }),
  "az802-q-029": corrected([trust, secure], {
    keyPoints: [
      "Trust failure can result from a machine-account password mismatch, a missing account or failure to reach a suitable DC.",
      "After checking DNS, connectivity and the computer object, repair a domain member's secure channel using an authorized domain credential.",
      "Deleting the computer account is not a mandatory prerequisite for repair or rejoin. A missing account requires recreation or a suitable domain-join procedure.",
    ],
    requirements: "For Windows Server 2025 domain members, use local administrator access and an authorized domain credential. Preserve the existing account where possible. Test-ComputerSecureChannel is not intended for domain controllers; follow their separate recovery procedure.",
    whyOthers: [
      "Deleting domain controllers damages the directory instead of repairing the member computer's trust.",
      "A public DNS suffix does not restore the machine-account secret or AD DNS/DC connectivity.",
      "Disabling Kerberos does not repair machine-account trust and disrupts authentication that relies on Kerberos.", "",
    ],
    rationale: r("After verifying connectivity and the account, restore this domain member's secure channel with an authorized domain credential.", "پس از بررسی اتصال و حساب، کانال امن این رایانهٔ عضو دامین را با اعتبارنامهٔ مجاز دامین بازیابی کنید.", "Stellen Sie nach Prüfung von Verbindung und Konto den sicheren Kanal dieses Domänenmitglieds mit berechtigten Domänenanmeldedaten wieder her."),
  }),
  "az802-q-049": corrected([application, `${learn}windows/win32/ad/enumerating-application-directory-partitions-in-a-forest`, ps("get-adrootdse")], {
    commandPath: [{ label: "Read naming contexts hosted by DC01, including its application replicas", command: "Get-ADRootDSE -Server DC01 | Select-Object -ExpandProperty namingContexts" }],
    requirements: "For Windows Server 2025 AD DS, application partitions replicate to their configured DC replica set and are separate from global catalog data. RootDSE lists partitions hosted by the selected server, not all application partitions in the forest. Forest-wide enumeration examines crossRef objects under CN=Partitions and filters systemFlags and nCName.",
    rationale: r("An application directory partition stores service-specific data with a selected replica set, rather than replacing the domain partition.", "پارتیشن دایرکتوری برنامه، داده‌های مخصوص سرویس را با مجموعهٔ منتخب نسخه‌ها ذخیره می‌کند و جایگزین پارتیشن دامین نمی‌شود.", "Eine Anwendungsverzeichnispartition speichert dienstspezifische Daten auf ausgewählten Replikaten, ohne die Domänenpartition zu ersetzen."),
  }),
  "az802-q-306": corrected([identifiers, names], {
    keyPoints: [
      "A SID uniquely identifies a security principal for Windows authorization; resource ACLs and access tokens use SIDs.",
      "A same-domain rename preserves the SID. A cross-domain user move creates a new objectSid; the prior SID can be retained in sIDHistory.",
      "The same directory object's objectGUID stays stable throughout its lifetime, including rename or move. sAMAccountName is a mutable logon name unique within a domain.",
    ],
    whyOthers: ["", "sAMAccountName is a legacy logon name unique within a domain; it is mutable and is not the SID used for authorization.", "Display name is a human-readable label, not a unique Windows security-principal identifier.", "The primary group attribute identifies a group relationship, not the principal's own unique SID."],
    rationale: r("Windows uses SIDs to identify security principals in authorization. Renaming preserves a SID; moving a user to another domain generates a new SID.", "ویندوز برای شناسایی موجودیت‌های امنیتی در کنترل دسترسی از SID استفاده می‌کند. تغییر نام SID را حفظ می‌کند؛ انتقال کاربر به دامین دیگر SID جدیدی ایجاد می‌کند.", "Windows identifiziert Sicherheitsprinzipale bei der Zugriffsprüfung anhand von SIDs. Eine Umbenennung behält die SID bei; ein domänenübergreifender Benutzerumzug erzeugt eine neue SID."),
  }),
};
