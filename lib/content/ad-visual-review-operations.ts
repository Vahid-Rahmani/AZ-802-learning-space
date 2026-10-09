/** Reviewed corrections only; integration preserves question identities and order. */
import type { Question } from "./questions";
import { questions } from "./questions";
import { operationsSources as s } from "./ad-visual-guides-operations";

const prp = "https://learn.microsoft.com/en-us/powershell/module/activedirectory/add-addomaincontrollerpasswordreplicationpolicy?view=windowsserver2025-ps";
const prpStorage = "https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/rodc-replicates-passwords-grant-incorrect-permissions";
const accounts = "https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/account-policies";
const bin = "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/adac/active-directory-recycle-bin";
const r = (en: string, fa: string, de: string): Question["rationale"] => ({ en, fa, de });
function reviewed(sourceRefs: string[], changes: Partial<Question>): Partial<Question> {
  return { ...changes, sourceRefs, reviewStatus: "technical-approved" };
}

const corrections: Record<string, Partial<Question>> = {
  "az802-q-012": reviewed([s.sysvol], {
    commandPath: [{ label: "Read the SYSVOL migration global state", command: "dfsrmig /getglobalstate" }, { label: "Check whether all DCs reached the migration state", command: "dfsrmig /getmigrationstate" }],
    requirements: "Windows Server 2025/2022/2019/2016. These read-only commands report FRS-to-DFSR migration state, not complete replication health. Eliminated (3) is the final DFSR migration state; verify all DCs and inspect the DFS Replication event log before any repair.",
  }),
  "az802-q-014": reviewed([prp, prpStorage, s.cache], {
    keyPoints: ["Each RODC has an effective Password Replication Policy with allowed and denied accounts/groups.", "The policy references are AD attributes on that RODC's computer object, including msDS-RevealOnDemandGroup and msDS-NeverRevealGroup; they are not a policy stored exclusively on its writable partner.", "Deny takes priority. Permission to cache does not mean a password has already been cached; inspect revealed accounts separately."],
    requirements: "Windows Server 2025 RODC administration. Make policy changes through a writable DC with appropriate rights and verify the policy for the specific RODC. Default groups are policy inputs; accounts can also be allowed or denied directly.",
    rationale: r("Password Replication Policy controls credential caching per RODC; deny entries override allow entries.", "سیاست Password Replication Policy مشخص می‌کند اعتبارنامهٔ چه حساب‌هایی در هر RODC قابل ذخیره است؛ ورودی Deny بر Allow اولویت دارد.", "Die Password Replication Policy steuert den Kennwortcache je RODC; Deny hat Vorrang vor Allow."),
  }),
  "az802-q-015": reviewed([prp, s.cache], {
    options: ["Move the users to the local Administrators group", "Allow a branch-only security group in this RODC's Password Replication Policy", "Disable Kerberos", "Make the RODC a Global Catalog only"], correct: 1,
    optionsFa: ["کاربران را به گروه Administrators محلی منتقل کنید", "در Password Replication Policy این RODC، گروه امنیتی مختص همان شعبه را مجاز کنید", "Kerberos را غیرفعال کنید", "RODC را فقط Global Catalog کنید"],
    rationale: r("Allow only the branch group on the specific RODC. A broad group containing all employees would permit caching outside the intended branch population.", "فقط گروه مختص شعبه را در سیاست همان RODC مجاز کنید؛ گروه همهٔ کارکنان، ذخیرهٔ اعتبارنامهٔ افراد خارج از شعبه را نیز مجاز می‌کند.", "Erlauben Sie nur die Gruppe dieser Niederlassung auf dem betreffenden RODC. Eine Gruppe aller Beschäftigten erweitert den Cache über den gewünschten Personenkreis hinaus."),
    keyPoints: ["PRP is evaluated per RODC, so a branch-only group can be allowed without allowing every employee.", "A deny entry overrides an allow entry.", "Allowing an account and prepopulating its credential are different operations; check RevealedAccounts to confirm storage."],
    whyOthers: ["Local Administrators membership changes local administration, not which domain credentials PRP permits caching.", "", "Disabling Kerberos does not configure a branch-only password cache.", "Global Catalog placement does not define PRP cache eligibility."],
    requirements: "Windows Server 2025. Use an appropriately privileged account and a writable DC for PRP changes. Only approved branch identities should be allowed; verify caching separately before a WAN outage.",
    commandPath: [{ label: "LAB WRITE: allow only the branch group on this RODC", command: "Add-ADDomainControllerPasswordReplicationPolicy -Identity BRANCH-RODC -AllowedList 'Branch-Employees'" }, { label: "Read which approved credentials are actually cached", command: "Get-ADDomainControllerPasswordReplicationPolicyUsage -Identity BRANCH-RODC -RevealedAccounts" }],
  }),
  "az802-q-025": reviewed([s.fgpp, s.pso], {
    requirements: "Windows Server 2025 GUI guidance assumes domain functional level Windows Server 2012 or later; the underlying FGPP feature originated at Windows Server 2008 domain functional level. Distinct precedence values are recommended, not an AD invariant: the resultant-PSO algorithm resolves equal values with objectGUID. PSOs target domain users/global security groups, not OUs or computer accounts.",
  }),
  "az802-q-026": reviewed([accounts, s.fgpp, s.pso], {
    keyPoints: ["The domain-wide account policy is defined by domain-root-linked GPOs and their applicable precedence; Default Domain Policy is the usual location, not the only possible GPO.", "An OU-linked password policy cannot give a selected subset of domain users different domain password requirements; use PSOs for those exceptions.", "Get-ADUserResultantPasswordPolicy returns a user's resultant PSO. If no PSO applies, the domain default policy is used; read it with Get-ADDefaultDomainPasswordPolicy."],
    requirements: "Windows Server 2025. Keep domain account policy at the domain root and account for GPO precedence. A separate domain-root-linked GPO can take precedence over Default Domain Policy; a DC-OU link does not define separate domain-user password policy.",
    rationale: r("Domain account policy is defined at the domain root. Fine-grained PSOs provide user/group exceptions, independently of an OU-linked password GPO.", "سیاست رمز عبور حساب‌های دامنه در ریشهٔ دامنه تعریف می‌شود؛ PSO برای کاربران یا گروه‌ها استثنا ایجاد می‌کند، نه GPO متصل به OU.", "Die Kennwortrichtlinie für Domänenkonten wird an der Domänenwurzel festgelegt. PSOs ermöglichen Ausnahmen für Benutzer oder Gruppen."),
    commandPath: [{ label: "Read the user's effective PSO", command: "Get-ADUserResultantPasswordPolicy -Identity a.smith" }, { label: "Read the default policy when no PSO applies", command: "Get-ADDefaultDomainPasswordPolicy -Identity corp.contoso.com" }],
  }),
  "az802-q-043": reviewed([s.stage, s.rodc, s.levels], {
    text: "Which operation pre-creates a delegated RODC account in AD DS without promoting the target server?",
    textFa: "کدام عملیات، حساب RODC را با امکان واگذاری نصب در AD DS از پیش ایجاد می‌کند، بدون اینکه سرور مقصد را به Domain Controller ارتقا دهد؟",
    options: ["Format-Volume", "Add-ADDSReadOnlyDomainControllerAccount", "Enable-DhcpServer", "ConvertTo-MsolDomain"], correct: 1,
    optionsFa: ["Format-Volume", "Add-ADDSReadOnlyDomainControllerAccount", "Enable-DhcpServer", "ConvertTo-MsolDomain"],
    rationale: r("Add-ADDSReadOnlyDomainControllerAccount stages an RODC account and can delegate later installation. The target server is promoted separately; Install-ADDSDomainController has no -PrepareOnly parameter.", "Add-ADDSReadOnlyDomainControllerAccount حساب RODC را از پیش ایجاد می‌کند و می‌تواند نصب بعدی را واگذار کند؛ ارتقای سرور جداگانه انجام می‌شود و پارامتر -PrepareOnly وجود ندارد.", "Add-ADDSReadOnlyDomainControllerAccount erstellt das RODC-Konto vorab und kann die spätere Installation delegieren. Die Serverheraufstufung erfolgt separat; -PrepareOnly ist kein gültiger Parameter."),
    keyPoints: ["Staged RODC deployment pre-creates a named RODC account in AD DS.", "DelegatedAdministratorAccountName specifies who can later attach/promote the matching server.", "This is distinct from forest/domain adprep and virtual DC cloning."],
    whyOthers: ["Format-Volume formats storage; it does not stage an AD DS RODC account.", "", "DHCP configuration does not pre-create an RODC account.", "ConvertTo-MsolDomain is unrelated to staged on-premises RODC deployment."],
    requirements: "Windows Server 2025 ADDSDeployment tools. An administrator stages the account against the intended domain/site and delegates installation. Installing the matching Windows Server 2025 DC requires forest and domain functional levels of at least Windows Server 2016, the AD DS role, and normal RODC promotion prerequisites.",
    commandPath: [{ label: "LAB WRITE: stage a named RODC account with a delegated installer", command: "Add-ADDSReadOnlyDomainControllerAccount -DomainControllerAccountName BRANCH-RODC -DomainName corp.contoso.com -SiteName Branch -DelegatedAdministratorAccountName 'CONTOSO\\RODC-Installers'" }],
  }),
  "az802-q-047": reviewed([s.metadata], {
    requirements: "Windows Server 2025. Domain Admins or equivalent is the minimum documented permission. Connect modern ADUC/RSAT to a surviving replication partner in the failed controller's domain. The failed DC must be permanently offline; healthy controllers should be gracefully demoted. Review DNS/GC/FSMO impact and never return the retired installation unchanged.",
    keyPoints: ["Forced removal/permanent controller loss can leave directory replication metadata behind.", "Modern ADUC performs metadata cleanup when the DC computer object is deleted through its permanent-offline confirmation.", "Verify remaining replication, Sites and Services, FSMO roles and stale DNS records; metadata cleanup does not imply every DNS reference has vanished."],
    commandPath: [{ label: "LAB DELETE: use the DC-specific GUI after permanent failure is confirmed", command: "AD Users and Computers → Change Domain Controller (surviving partner) → Domain Controllers → failed DC → Delete → confirm exact name → This Domain Controller is permanently offline" }],
  }),
  "az802-q-050": reviewed([s.authoritative, s.recovery], {
    rationale: r("A supported authoritative restore recovers the original backed-up object and marks it authoritative for replication. A new account with the same name has a different identity; Recycle Bin is a separate eligible-object recovery method.", "بازیابی معتبرِ پشتیبانی‌شده، شیء اصلی موجود در پشتیبان را بازیابی و برای تکثیر معتبر می‌کند؛ ساخت حساب هم‌نام هویت جدیدی می‌دهد. Recycle Bin روش جداگانه‌ای است.", "Eine unterstützte autoritative Wiederherstellung stellt das ursprüngliche Objekt aus der Sicherung wieder her und markiert es für die Replikation als maßgeblich. Ein neu erstelltes Konto erhält eine andere Identität."),
    keyPoints: ["Authoritative restore starts from a suitable directory/system-state backup containing the original object.", "After restoration in DSRM, ntdsutil can mark a selected object authoritative; group-link/membership recovery can require additional generated LDIF steps.", "Recreating the user produces a different SID/GUID. Recycle Bin recovery is a separate workflow for eligible deletions."],
    requirements: "Windows Server 2025 recovery planning. Isolated-lab reference only: use verified pre-deletion backups, DSRM credentials and a supported restore/isolation/reconnection plan. Marking one object authoritative is not automatically a forest-wide restore. Backup-time passwords and attributes may roll back; restore missing parents and verify memberships.",
    commandPath: [{ label: "LAB RESTORE: only after directory backup restore in DSRM; substitute the exact test DN", command: 'ntdsutil\nactivate instance ntds\nauthoritative restore\nrestore object "CN=LabUser,OU=Lab,DC=corp,DC=contoso,DC=com"\nquit\nquit' }],
  }),
  "az802-q-051": reviewed([bin], {
    keyPoints: ["Enable the AD Recycle Bin forest feature before the relevant deletion; activation cannot recover objects already deleted before it was enabled.", "Activation is irreversible: Microsoft documents that it cannot be disabled.", "The required forest/domain functional levels must already be Windows Server 2008 R2 or later. Enabling the feature does not automatically raise them."],
    requirements: "Windows Server 2025. Verify functional levels and appropriate forest-wide enablement rights first, then allow configuration replication to complete. Recover only eligible objects within their deleted-object lifetime. Recycle Bin does not replace AD DS backups or forest recovery planning.",
    rationale: r("The forest feature must already be enabled before deletion so the attributes needed for Recycle Bin recovery are retained. Activation is irreversible.", "قابلیت Recycle Bin باید پیش از حذف در Forest فعال شده باشد تا ویژگی‌های لازم برای بازیابی حفظ شوند؛ فعال‌سازی برگشت‌پذیر نیست.", "Die Forest-Funktion muss vor der Löschung aktiviert sein, damit die nötigen Attribute erhalten bleiben. Die Aktivierung lässt sich nicht rückgängig machen."),
  }),
  "az802-q-054": reviewed([s.delegation], {
    requirements: "Windows Server 2025. Use OU-scoped task delegation, a help-desk group and unprivileged test accounts. Inheritance and deny entries affect the result; protected administrator accounts may not inherit ordinary OU delegation. Review actual ACLs rather than assuming moving any account automatically changes its effective rights.",
    commandPath: [{ label: "LAB ACCESS CHANGE: delegate only the reset task", command: "AD Users and Computers → target OU → Delegate Control → help-desk group → Reset user passwords and force password change at next logon → Finish" }],
  }),
  "az802-q-055": reviewed([s.scope, s.gpo], {
    keyPoints: ["A domain-root GPO link can affect many descendant users and computers.", "Security/WMI filters, disabled sections, inheritance and enforcement determine actual applicability.", "Test a restricted OU/user/computer scenario before deploying a broad root link."],
  }),
  "az802-q-056": reviewed([s.gpo], {
    keyPoints: ["Normal processing order is Local, Site, Domain, then parent-to-child OUs.", "Later applicable settings normally take precedence for conflicts; at the same container, link order 1 has highest priority.", "Block Inheritance changes which ancestor links apply; enforcement preserves ancestor precedence. These are exceptions to normal scope/conflict rules, not a reversal of every processing step."],
  }),
  "az802-q-058": reviewed([s.gpo], {
    requirements: "Windows Server 2025 GPMC. Set Block Inheritance on a domain or OU, not an AD site. It blocks ordinary ancestor links, leaves links on the selected container intact, and does not override an enforced ancestor link or delete GPOs.",
  }),
  "az802-q-059": reviewed([s.gpo], {
    keyPoints: ["Enforced is a GPO-link property that prevents descendant links from overriding conflicting ancestor settings.", "An enforced ancestor link applies through Block Inheritance.", "Enforced does not bypass security/WMI filtering, enable disabled GPO sections or create a PSO Enforced property."],
    requirements: "Windows Server 2025. Review Group Policy Inheritance and the applicable link priorities. Do not describe enforcement as every GPO always processing last; it changes precedence and inheritance behavior for that link.",
  }),
  "az802-q-061": reviewed([s.modeling], {
    text: "Which graphical tool simulates the effect of Group Policy for a proposed user and computer scenario?",
    textFa: "کدام ابزار گرافیکی اثر Group Policy را برای سناریوی پیشنهادیِ یک کاربر و رایانه شبیه‌سازی می‌کند؟",
    rationale: r("Group Policy Modeling in GPMC simulates the planned scenario. Group Policy Results instead retrieves actual RSoP data from the target computer.", "Group Policy Modeling در GPMC سناریوی پیشنهادی را شبیه‌سازی می‌کند؛ Group Policy Results نتیجهٔ واقعی رایانهٔ مقصد را می‌گیرد.", "Group Policy Modeling in der GPMC simuliert das geplante Szenario. Group Policy Results ermittelt dagegen die tatsächlich angewendeten Einstellungen."),
    requirements: "Windows Server 2025 GPMC and appropriate Modeling permissions. A suitable DC performs the simulation; the simulated client need not be online. Modeling excludes local GPO evaluation, so validate actual behavior with Results/gpresult on the target.",
  }),
  "az802-q-062": reviewed([s.read, s.scope], {
    requirements: "Windows Server 2025. Authenticated Users normally has both Read and Apply Group Policy. Since MS16-072, the computer retrieves user GPOs in its own security context and needs Read. Removing Authenticated Users from Security Filtering removes both permissions; grant necessary computer Read separately while retaining the intended user Apply scope.",
  }),
  "az802-q-301": reviewed([prp, s.cache], {
    keyPoints: ["An RODC can forward uncached authentication to a reachable writable DC.", "The effective per-RODC PRP decides cache eligibility through allowed/denied accounts and groups; the default Allowed RODC Password Replication Group is not the only way to allow an account.", "Deny overrides allow. Actual cache contents are separate from eligibility and can be inspected with RevealedAccounts."],
    requirements: "Windows Server 2025. Accounts/groups can be added directly to this RODC's allowed list. Membership in the domain-wide Allowed RODC Password Replication Group is not mandatory. Preserve denials for privileged identities and verify the effective PRP.",
  }),
  "az802-q-302": reviewed([s.inbound, "https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-lsad/31ca2a31-0be4-4773-bcef-05ad6cd3ccfb"], {
    text: "Which ordinary AD DS operation cannot originate on a read-only domain controller?",
    textFa: "کدام عملیات معمول AD DS نمی‌تواند روی Domain Controller فقط‌خواندنی ایجاد شود؟",
    options: ["Authenticate an allowed user using an already cached credential", "Answer a query from its local directory replica", "Accept a client's originating directory update as a writable DC", "Receive inbound directory replication from a writable DC"], correct: 2,
    optionsFa: ["احراز هویت کاربر مجاز با اعتبارنامهٔ از قبل ذخیره‌شده", "پاسخ به جست‌وجو از نسخهٔ محلی Directory", "پذیرش تغییر اولیهٔ Directory از Client مانند DC قابل‌نوشتن", "دریافت تکثیر ورودی Directory از DC قابل‌نوشتن"],
    rationale: r("An RODC receives inbound replication but does not accept originating directory updates or provide ordinary outbound directory replication. Client writes require a writable DC.", "RODC تکثیر ورودی را دریافت می‌کند، اما تغییر اولیهٔ Directory را نمی‌پذیرد و تکثیر خروجی معمول انجام نمی‌دهد؛ نوشتن Client به DC قابل‌نوشتن نیاز دارد.", "Ein RODC empfängt eingehende Replikation, nimmt aber keine ursprünglichen Verzeichnisänderungen entgegen. Client-Schreibzugriffe benötigen einen beschreibbaren DC."),
    keyPoints: ["Read-only prevents originating directory writes, not incoming replication updates.", "An RODC receives its directory replica from writable partners.", "It can answer queries and authenticate eligible cached credentials, or forward authentication when connectivity allows."],
    whyOthers: ["Cached authentication is a supported RODC function.", "Directory queries can be answered from its read-only replica.", "", "Inbound replication is supported and is how the RODC receives directory changes."],
    requirements: "Windows Server 2025 RODCs. Distinguish replicated incoming updates from client-originated writes; read-only is not a prohibition on replication into the RODC.",
  }),
  "az802-q-303": reviewed([prp, s.cache], {
    text: "During a WAN outage, which configuration controls which approved branch users' passwords may be cached for local RODC authentication?",
    textFa: "هنگام قطع WAN، کدام تنظیم تعیین می‌کند رمز عبور کدام کاربران مجاز شعبه می‌تواند برای احراز هویت محلی در RODC ذخیره شود؟",
    options: ["The Password Replication Policy of the specific RODC", "A separate forest functional level for each branch site", "The number of Global Catalog servers alone", "The DNS suffix alone"], correct: 0,
    optionsFa: ["Password Replication Policy همان RODC", "Forest Functional Level جداگانه برای هر Site شعبه", "فقط تعداد سرورهای Global Catalog", "فقط DNS Suffix"],
    rationale: r("PRP controls which credentials the specific RODC may cache. Offline local authentication also requires the approved credentials to have actually been cached before the outage; otherwise a reachable writable DC is needed.", "PRP مشخص می‌کند همان RODC کدام اعتبارنامه‌ها را می‌تواند ذخیره کند؛ احراز هویت محلی هنگام قطع ارتباط، به ذخیرهٔ واقعی آن‌ها پیش از قطعی نیز نیاز دارد.", "Die PRP bestimmt, welche Kennwörter dieser RODC speichern darf. Für lokale Anmeldung während des WAN-Ausfalls müssen die erlaubten Kennwörter vorher tatsächlich gespeichert sein."),
    keyPoints: ["PRP is specific to each RODC and controls cache eligibility.", "Denied entries override allowed entries.", "Eligibility alone does not populate the cache; inspect revealed accounts or prepopulate approved credentials before an outage. Forwarded authentication needs a reachable writable DC."],
    whyOthers: ["", "A site does not have its own forest functional level, and functional level does not choose the permitted cache accounts.", "Global Catalog placement alone does not configure Password Replication Policy.", "A DNS suffix does not specify which credentials can be cached."],
    requirements: "Windows Server 2025. Interpret this as credential-cache eligibility, not proof of cache contents or a general rule that every authentication through an RODC must be local.",
  }),
  "az802-q-304": reviewed([s.delegation], {
    keyPoints: ["The Delegation of Control Wizard in ADUC grants selected tasks on the chosen container's eligible objects.", "A custom task can specify object types and individual permissions; object-specific delegation does not inherently grant full control.", "A help-desk security group can receive password reset rights without domain-wide administration."],
    requirements: "Windows Server 2025. The administrator running the wizard needs permission to delegate the selected rights. Review read/list access and the delegated ACLs; delegation is not a requirement to join Domain Admins.",
  }),
  "az802-q-308": reviewed([s.fgpp, s.pso], {
    text: "Which account is outside AD DS fine-grained password policy scope?",
    textFa: "کدام حساب خارج از محدودهٔ Fine-Grained Password Policy در AD DS است؟",
    options: ["A local account on a member server", "A domain user in a targeted global security group", "A domain user with a directly assigned PSO", "A targeted domain user whose password changed recently"], correct: 0,
    optionsFa: ["حساب محلی روی Member Server", "کاربر دامنه عضو گروه امنیتی Global هدف", "کاربر دامنه با PSO مستقیماً تخصیص‌یافته", "کاربر دامنهٔ هدف که اخیراً رمز خود را تغییر داده است"],
    rationale: r("FGPP applies to domain user objects and global security groups. A member server's local account is governed by local account policy, not an AD DS PSO.", "FGPP به اشیای کاربر دامنه و گروه‌های امنیتی Global اعمال می‌شود؛ حساب محلی Member Server از سیاست حساب محلی پیروی می‌کند، نه PSO دامنه.", "FGPP gilt für Domänenbenutzer und globale Sicherheitsgruppen. Ein lokales Konto auf einem Mitgliedsserver unterliegt der lokalen Kontorichtlinie."),
    keyPoints: ["PSOs apply to domain users or global security groups, not local accounts, OUs or computer objects.", "Direct user assignments take priority over group-derived PSOs in resultant-PSO selection.", "View resultant password settings or Get-ADUserResultantPasswordPolicy checks a domain user's effective PSO; GPO Enforced/link order is not the PSO mechanism."],
    whyOthers: ["", "A domain user in a targeted global security group is a supported FGPP subject.", "Direct PSO assignment to a domain user is supported.", "Recent password change does not remove a domain user from FGPP scope."],
    requirements: "Windows Server 2025. Use ADAC/ActiveDirectory tools with domain users/global security groups. Current GUI guidance assumes domain functional level Windows Server 2012 or later.",
    commandPath: [{ label: "Read the domain user's effective PSO", command: "Get-ADUserResultantPasswordPolicy -Identity test1" }],
  }),
  "az802-q-309": reviewed([s.pso, s.fgpp], {
    text: "Two PSOs apply directly to the same domain user and have equal precedence values. Which one is selected as the resultant PSO?",
    textFa: "دو PSO مستقیماً به یک کاربر دامنه اعمال شده‌اند و Precedence یکسان دارند. کدام‌یک به‌عنوان PSO نهایی انتخاب می‌شود؟",
    options: ["Neither, because equal precedence is invalid in AD DS", "The PSO with the smaller objectGUID", "The PSO with the larger minimum password length", "The PSO with an Enforced GPO link"], correct: 1,
    optionsFa: ["هیچ‌کدام، چون Precedence یکسان در AD DS نامعتبر است", "PSO با objectGUID کوچک‌تر", "PSO با حداقل طول رمز بزرگ‌تر", "PSO با پیوند GPO از نوع Enforced"],
    rationale: r("The resultant-PSO algorithm sorts the applicable set by precedence and breaks ties with smaller objectGUID values. Direct user PSOs are considered before group-derived PSOs; GPO link order and Enforced do not resolve PSO ties.", "الگوریتم PSO نهایی ابتدا بر اساس Precedence و در تساوی با objectGUID کوچک‌تر انتخاب می‌کند؛ PSO مستقیم کاربر بر PSO گروه اولویت دارد و Link Order یا Enforced دخیل نیست.", "Der Algorithmus sortiert die zutreffenden PSOs nach Precedence und löst Gleichstände mit der kleineren objectGUID. Direkte Benutzerzuweisungen werden vor Gruppenzuweisungen berücksichtigt."),
    keyPoints: ["Direct user assignments form the applicable set first; only if none exist are group-derived PSOs considered.", "Within that set, the smallest numeric precedence wins; equal values use the smaller objectGUID.", "PSOs do not use GPO Enforced or link-order conflict rules. Prefer distinct precedence values for predictable administration."],
    whyOthers: ["AD's resultant-PSO algorithm explicitly handles ties; distinct values are an administrative recommendation.", "", "Minimum password length is a policy setting, not the tie-breaker.", "GPO Enforced links do not resolve PSO assignment conflicts."],
    requirements: "Windows Server 2025. This scenario compares two PSOs in the same direct-user assignment set, avoiding ambiguity about direct-user versus group priority. Read the computed resultant PSO rather than inferring it from link order.",
    commandPath: [{ label: "Read PSO precedence and identity", command: "Get-ADFineGrainedPasswordPolicy -Filter * | Select-Object Name,Precedence,ObjectGUID" }, { label: "Read the selected PSO for the user", command: "Get-ADUserResultantPasswordPolicy -Identity test1" }],
  }),
  "az802-q-314": reviewed([s.backup, s.recovery], {
    optionsFa: ["پشتیبان System State", "پشتیبان اشتراک فایل از پوشهٔ اسناد", "تصویر یک Pool در Storage Spaces", "Snapshot فقط از سمت Primary در Storage Replica"],
    text: "Which backup captures the AD DS database and other system-state components needed for supported domain-controller directory recovery?",
    textFa: "کدام پشتیبان، پایگاه دادهٔ AD DS و سایر اجزای System State موردنیاز برای بازیابی پشتیبانی‌شدهٔ Directory روی Domain Controller را ذخیره می‌کند؟",
    rationale: r("A system-state backup includes AD DS and other critical system-state components. It supports directory recovery in a supported restore plan; it is not by itself a bare-metal backup for rebuilding a lost operating system or replacing failed disks.", "پشتیبان System State شامل AD DS و اجزای مهم وضعیت سیستم است؛ برای بازیابی Directory در برنامهٔ پشتیبانی‌شده کاربرد دارد، اما به‌تنهایی پشتیبان Bare-Metal برای بازسازی سیستم‌عامل یا دیسک ازدست‌رفته نیست.", "Eine System-State-Sicherung enthält AD DS und weitere kritische Systemkomponenten. Sie ersetzt keine Bare-Metal-Sicherung für den Wiederaufbau eines verlorenen Betriebssystems."),
    keyPoints: ["System state includes AD DS, SYSVOL, registry and other role-dependent system components.", "A documents-folder backup does not capture the required AD DS system state.", "For lost operating-system/disk recovery, plan an appropriate full-server/bare-metal recovery as well; test the supported restore path."],
    requirements: "Windows Server 2025. Secure backups separately from the controller and test recovery. Do not assume a system-state-only backup supports restoring to a newly reinstalled or different server installation. Use a supported same-server/full-server recovery plan and DSRM credentials.",
    commandPath: [{ label: "LAB BACKUP WRITE: use a dedicated, verified backup volume", command: "wbadmin start systemstatebackup -backupTarget:F:\\" }, { label: "Read available backup versions", command: "wbadmin get versions" }],
  }),
};

/** Preserve unrelated historical audit flags; this pass verifies Microsoft sources and technical answers only. */
export const operationsQuestionCorrections: Record<string, Partial<Question>> = Object.fromEntries(
  Object.entries(corrections).map(([id, changes]) => {
    const original = questions.find((question) => question.id === id);
    if (!original) throw new Error(`Missing original question for operations correction: ${id}`);
    return [id, { ...changes, audit: { ...original.audit, sourceRefs: changes.sourceRefs ?? original.audit.sourceRefs, sourceVerified: true, answerVerified: true, reviewer: "AD operations: Microsoft source and technical answer review; other audit flags retained from prior review", reviewedAt: "2026-10-09T00:00:00.000Z" } }];
  }),
);
