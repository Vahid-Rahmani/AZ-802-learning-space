# مسیر عملی Cisco — شرکت مدار

تاریخ بررسی محتوا: 2026-10-11. اتصال مرحلهٔ اول: ۱۰ تمرین پایه از `/ccna/learning` و `/ccna/sim?task=001` قابل دسترسی‌اند. بررسی نهایی اجرای UI پس از آخرین پوش انجام می‌شود.

`curriculum.json` نقشهٔ مسیر و منابع است؛ `tasks-001-010.json` مرجع متن کامل فارسی و دادهٔ ۱۰ تسک نخست است. اتصال runtime در `lib/content/cisco-learning.ts` است. شناسهٔ ۱۰۹ لب قبلی و پیشرفت کاربران تغییر نمی‌کنند؛ تمرین‌های جدید شناسه و ذخیرهٔ مستقل و وابسته به حساب در مرورگر دارند. قالب‌ها با موتور موجود کار می‌کنند و بازطراحی UI انجام نشده است.

## نقشهٔ مرحله‌ها

| مرحله | ترتیب آموزش | پیش‌نیاز آموزشی | رشد شبکه |
| --- | --- | --- | --- |
| S01 | Console، Help، Mode، Hostname، دسترسی اولیه، Save | ندارد | SW1 و دو PC |
| S02 | Ethernet، MAC/ARP، IPv4، Subnetting، Gateway، IPv6، Connectivity | S01 | آدرس‌دهی شبکهٔ اولیه |
| S03 | VLAN، Access، Trunk، Native/Allowed VLAN، STP، EtherChannel | S01 و IPv4 از S02 | SW2 و لینک افزونه |
| S04 | Inter-VLAN، Static/Default route، جدول Routing، Single-area OSPF | S02 و S03 | R1 و R2 |
| S05 | DHCP/Relay، DNS، NAT/PAT، ACL، NTP، Syslog، Wireless | S04 | Server، WAN و AP |
| S06 | SSH، Hardening، Port Security، AAA، حفاظت L2، Automation پایه | S03 تا S05 | مدیریت امن |
| S07 | ساخت شعبه، تغییر نیاز، Fault، Incident، Capstone زمان‌دار | S01 تا S06 | دفتر اصلی و شعبه |
| S08 | OSPF چندناحیه‌ای، EIGRP/BGP، Policy، Redistribution، VRF، Redundancy، QoS، Multicast، VPN، IPv6 | S07 | چند شعبه و مسیر پشتیبان |
| S09 | AAA، RADIUS/TACACS+، 802.1X، ISE، Segmentation، حفاظت L2/L3 | S06 و S08 | Identity services |
| S10 | ASA/ASAv، FTDv/FMCv، ISE، Catalyst 9800-CL | S09 و Wireless از S05 | Appliance و Controller |
| S11 | API، Python/Ansible، Assurance، Telemetry، SD-WAN، SD-Access | S08 و S09 | پایش و تغییر خودکار |
| S12 | Design، Deploy، Operate، Optimize و Fault جامع | S08 تا S11 | CCIE Enterprise Infrastructure capstone |
| S13 | SCOR، راهکارهای Cisco Security، Incident response و Capstone | S08 تا S11 | شاخهٔ اختیاری CCIE Security |

پیش‌نیازها آموزشی‌اند، نه شرط رسمی شرکت در آزمون. S13 برای پایان مسیر Enterprise اجباری نیست. ده تسک نخست بخشی از S01 تا S03 هستند؛ برای معرفی VLAN لازم نیست تمام مباحث IPv6 قبلاً تمام شده باشند.

## قرارداد دستگاه و توپولوژی

قالب `base`: `PC-A Gi0/0 ↔ SW1 Gi0/1` و `PC-B Gi0/0 ↔ SW1 Gi0/2`.
قالب `expanded`: PC-A در جای قبلی، `SW1 Gi0/3 ↔ SW2 Gi0/1` و `PC-B Gi0/0 ↔ SW2 Gi0/2`.

قالب‌ها از نقش‌های موجود `switch` و `host` استفاده می‌کنند. آن‌ها لب منتشرشده نیستند؛ وجود پورت در مدل پیش‌فرض به معنی وجود همین قالب در رجیستری سایت نیست. در لب دارای Fa باید پورت واقعی آن لب نگاشت شود. `relatedExistingLabs` فقط مرجع بازاستفاده است، نه معادل‌بودن توپولوژی یا انتقال خودکار پیشرفت.

فرمان IP روی Host قرارداد کنسول آموزشی سایت است، نه دستور Windows/Linux. `show version` IOS واقعی نشان نمی‌دهد. SSH/RSA/Secret مدل آموزشی‌اند، نه رمزنگاری یا مخزن امن؛ رمز واقعی وارد نکن.

## اتصال به ساختار موجود

گراف موجود با `SimLabStep`، `SimLabPack`، `createLabSession` و `ccnaLabPath` بررسی شد. نقاط اتصال: `lib/ccna-sim/lab.ts`، `session.ts`، `commands.ts`، `management.ts`، `lib/content/ccna-sim/index.ts` و `lib/content/ccna-lab-path.ts`. موتور یا گراف موازی ساخته نمی‌شود.

- هدف تنظیمات از وضعیت واقعی `LabModel.device` و `port` خوانده شود، نه transcript.
- کابل با `linked` و ارتباط با `reachesDevice` بررسی شود؛ مقصد دستگاه دیگری باشد و IP آن به همان دستگاه تعلق داشته باشد.
- Self-ping، IP تکراری و اجرای مکرر Show چند هدف را تکمیل نکنند.
- Save فقط با تطابق Startup و Running نهایی قبول شود.
- تسک‌های 001 و 004 پاسخ/شاهد انسانی لازم دارند؛ ارزیاب پاسخ در UI فعلی وجود ندارد. برای آن‌ها تیک خودکار جعلی یا دکمهٔ دستی جدید ساخته نشود.
- معیارهای JSON مشخصات تألیف‌اند، نه زبان predicate اجراشده. نصب grader یا اتصال runtime در این تحویل انجام نشده است.
- کاوش خارج از درس مجاز است. انتخاب دستگاه اشتباه فقط راهنما می‌دهد؛ کنسول قفل نمی‌شود. خراب‌شدن هدف قبلی، وضعیت فعلی آن را ناموفق می‌کند؛ سابقهٔ یادگیری جدا حفظ شود.
- Fault و وضعیت شروع روی نسخهٔ تمرینی اعمال شوند، نه Resume کاربر. Save دستگاه شبکه و Resume میزبان یک مفهوم نیستند.
- قبل از انتشار، هر تسک باید وضعیت شروع حل‌نشده، راه‌حل موفق و حالت منفی معتبر داشته باشد. درصد مدل و تکمیل بخش هدایت‌شده جدا گزارش شوند.

## نسخه و محدودیت

CCNA مبنا `200-301 v1.1` است؛ Overlay رسمی `v2.0` از 2027-02-03 فعال می‌شود. شناسه‌ها ثابت می‌مانند و اهداف تغییرکرده جدا نگاشت می‌شوند. Enterprise بر ENCOR v1.2 و مسیر انتخابی ENARSI v1.1 است؛ ENARSI تنها انتخاب ممکن نیست. Expert اصلی EI v1.1 و شاخهٔ اختیاری Security با SCOR v2.0 و Security v6.1 است. منابع رسمی در JSON ثبت شده‌اند.

ARP/MAC table، enable secret، حفاظت Console، STP، EtherChannel، OSPF، DHCP/NAT و ACL در موتور بررسی‌شده پیاده نیستند. قابلیت‌های پیشرفته تا تأیید مستقل، هدایت‌شده می‌مانند. ASA/FTD/FMC/ISE/9800 مدل اختصاصی ندارند؛ Host یا Router را به‌عنوان Appliance واقعی معرفی نکنید. آموزش Wireless/Appliance تکمیلی است و تمام آن الزام ENCOR v1.2 نیست. این نقشه پوشش سطح موضوع است، نه گواهی پوشش کامل Blueprint آزمون.

پس از 010، تمرین [011 — SVI و SSH](task-011-ssh.md) تألیف شده است؛ هنوز در UI یا ارزیاب فعال نیست. پس از آن تألیف با STP/EtherChannel هدایت‌شده → Router/Inter-VLAN → Static/Default route → Services → شعبه ادامه می‌یابد؛ سپس مرحله‌های حرفه‌ای. موضوعات آینده به‌عنوان تسک کامل تحویل‌شده شمرده نمی‌شوند.
