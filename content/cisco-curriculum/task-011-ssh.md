# Task 011 — مدیریت SW1 و SW2 با SSH

وضعیت: محتوای آموزشی؛ هنوز در سایت فعال نشده است. پیش‌نیاز: تسک‌های 002 و 009، سپس تعمیر موفق 010. نوع: Build + Change request + Troubleshooting. زمان پیشنهادی: ۱۵ دقیقه.

## سناریو و شروع

در شرکت مدار، دو Switch و دو PC شبکهٔ فروش را سالم کرده‌ای. اکنون مدیر IT می‌خواهد از PC-A به هر دو Switch دسترسی مدیریت داشته باشد، بدون بازکردن Telnet. توپولوژی همان `expanded` است؛ دستگاه یا قابلیت جدیدی جعل نمی‌شود.

شروع: وضعیت سالم پایان 009/010؛ PC-A برابر `192.168.10.10/26`، PC-B برابر `192.168.10.20/26`، VLAN 10 و Trunk دوطرفه برقرار، IPv6 قبلی حفظ شده است. VTYهای هر دو Switch ورود شبکه‌ای را با `transport input none` می‌بندند؛ SVI مدیریت، Domain و RSA هنوز تنظیم نشده‌اند. پس هدف SSH در شروع کامل نیست.

پیش‌درس: Switch برای مدیریت خودش به IP نیاز دارد، اما این IP آن را Router نمی‌کند. آدرس مدیریت روی SVI قرار می‌گیرد؛ برای این درس `interface vlan 10`. PC-A و دو SVI در یک Subnet هستند، پس برای این ارتباط Gateway لازم نیست. SSH سرور به هویت دستگاه، Domain، کلید و سیاست ورود VTY نیاز دارد.

## هدف و نگاشت دستگاه

- SW1: `interface vlan 10` → `192.168.10.2 255.255.255.192`، فعال.
- SW2: همان Interface → `192.168.10.3 255.255.255.192`، فعال.
- هر دو: Domain برابر `madar.lab`، حساب آزمایشگاهی `netadmin` با Secret، RSA مدل حداقل 2048، SSH version 2، تمام VTYهای 0–15 دارای `login local` و SSH-only.
- PC-A: بتواند به هر دو آدرس مدیریت برسد و ورود آزمایشگاهی SSH را امتحان کند.
- Save نهایی هر دو Switch، بدون خرابی IPv4/IPv6، VLAN یا Trunk قبلی.

نقش دستگاه‌ها فقط `switch` و `host` موجود است. SVI، کلید مدل، حساب محلی، VTY، Ping و `ssh -l` در موتور موجودند. این محیط SSH/RSA را شبیه‌سازی می‌کند؛ هیچ ارتباط رمزگذاری‌شده یا کلید واقعی تولید نمی‌شود. رمز حساب واقعی خود را وارد نکن. این درس AAA/ISE، ACL یا Firmware واقعی را شبیه‌سازی‌شده معرفی نمی‌کند.

## گام‌ها

۱. ابتدا SW1 را انتخاب کن. SVI و تنظیمات SSH آن را بساز؛ PC-A قبل از این تنظیمات مقصد مدیریتی ندارد.
۲. همین سیاست را روی SW2 با IP متفاوت اعمال کن. تنظیم درست SW1 به‌جای SW2 پذیرفته نشود.
۳. در PC-A دو مقصد را Ping کن، سپس به هر کدام وارد شو. ورود با رمز اشتباه باید رد شود. با `exit` به کنسول PC-A برگرد.
۴. روی هر دو Switch، Running و Startup را مقایسه کن. پس از هر تغییر دوباره Save کن.

## راهنمای اختیاری

Hint 1: IP مدیریت روی پورت Access میزبان نوشته نمی‌شود؛ از SVI استفاده کن.

Hint 2: `ip domain-name madar.lab` را پیش از تولید کلید مدل تنظیم کن؛ VTY را برای تمام خطوط انتخاب کن.

Hint 3: `interface vlan 10`، سپس IP و `no shutdown`؛ برای ورود `line vty 0 15`، `login local` و `transport input ssh`.

## راه‌حل کامل

روی SW1:

```text
enable
configure terminal
hostname SW1
interface vlan 10
ip address 192.168.10.2 255.255.255.192
no shutdown
exit
ip domain-name madar.lab
username netadmin privilege 15 secret LabOnly-SSH011
crypto key generate rsa modulus 2048
ip ssh version 2
line vty 0 15
login local
transport input ssh
end
copy running-config startup-config
```

روی SW2 همان فرمان‌ها، با `hostname SW2` و IP برابر `192.168.10.3`.

روی PC-A:

```text
ping 192.168.10.2
ping 192.168.10.3
ssh -l netadmin 192.168.10.2
```

در Prompt رمز، فقط `LabOnly-SSH011` را وارد کن. پس از ورود، `show running-config` و سپس `exit`؛ دوباره از PC-A با `ssh -l netadmin 192.168.10.3` مقصد دوم را بررسی کن. نام دستگاه مقصد باید متفاوت باشد. تنظیمات این اتصال همان تنظیمات کنسول مستقیم دستگاه است، نه یک کپی مستقل.

## Verification و معیار تیک‌ها

روی هر Switch: `show ip interface brief`، `show ip ssh`، `show running-config` و `show startup-config`. روی PCها ارتباط IPv4/IPv6 قبلی نیز برقرار بماند.

تیک خودکار فقط از مدل جاری دستگاه خوانده شود؛ این سند هنوز این توابع را نصب نمی‌کند:

| معیار | شرط واقعی |
| --- | --- |
| SVI SW1 | VLAN 10 موجود؛ SVI صحیح و فعال؛ IP .2/26 فقط متعلق به SW1؛ PC-A واقعاً به SW1 می‌رسد |
| SVI SW2 | همان بررسی مستقل برای .3/26 و SW2 |
| هویت SSH هر Switch | Hostname هدف، Domain، RSA حداقل 2048، SSHv2 و حساب محلی با Secret غیرخالی |
| VTY هر Switch | هر ۱۶ خط دارای loginLocal و دقیقاً transport=[ssh]؛ یک خط Telnet نیز رد می‌شود |
| حفظ شبکه | کابل‌ها، Access VLAN 10، Trunk، آدرس‌های IPv4/IPv6 و ارتباط دوطرفهٔ PCها مطابق 009 |
| Save | Startup هر دو Switch موجود و مطابق Running نهایی |

موفقیت واقعی ورود SSH آزمون جداگانه دارد؛ داشتن تنظیمات صحیح به معنی اثبات اجرای Login نیست. در نبود ارزیاب Session، نتیجهٔ این آزمون هدایت‌شده و جدا از درصد تنظیمات نمایش داده شود. تکرار `show ip ssh` نباید امتیاز بدهد. آدرس مقصد روی خود PC-A یا یک دستگاه دیگر نباید معیار named-device را قبول کند.

## Fault و تعمیر

از نسخهٔ سالم شروع کن. روی SW2، در `line vty 5 15` فرمان `transport input telnet` اعمال کن؛ سپس `crypto key zeroize rsa` را در Global اجرا کن و Save نکن. نتیجه: سیاست همهٔ خطوط خراب و کلید حذف شده است؛ اتصال SSH باید رد شود و Startup نیز قدیمی است.

تعمیر: از Console خود SW2، کلید مدل را دوباره تولید کن؛ `line vty 0 15` → `login local` → `transport input ssh`؛ سپس `end` و Save. IPv4، VLAN یا Trunk سالم را برای تعمیر SSH تغییر نده.

آزمون منفی اضافی: رمز اشتباه، کابل Trunk قطع، SVI خاموش و IP تکراری را هرکدام در نسخهٔ جدا امتحان کن؛ سپس علت را مشخص و همان مورد را اصلاح کن.

## چرا کار می‌کند؟

VLAN و مسیر لایهٔ ۲ دسترسی به SVI را فراهم می‌کنند؛ آدرس‌دهی درست شرط Reachability است. هویت و کلید مدل سرور را آماده می‌کنند و VTY تعیین می‌کند ورود چگونه احراز و کدام Transport پذیرفته شود. Save نسخهٔ نهایی را نگه می‌دارد. بازشدن SSH مجوز بازکردن Telnet یا تغییر شبکهٔ سالم نیست.

مهارت‌ها: SVI، مدیریت Same-subnet، Local authentication، SSHv2، VTY hardening، Save و عیب‌یابی مسیر/احراز هویت.

منبع رسمی، بررسی‌شده در 2026-10-11: [Cisco — Configure SSH on Routers](https://www.cisco.com/c/en/us/support/docs/security-vpn/secure-shell-ssh/4145-ssh.html). فرمان‌های این درس زیرمجموعهٔ تأییدشدهٔ موتور سایت‌اند؛ قابلیت‌های بیشتر سند Cisco الزاماً در این موتور وجود ندارند.
