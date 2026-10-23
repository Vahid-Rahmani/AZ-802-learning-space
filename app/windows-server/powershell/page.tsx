"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, BookOpen, Check, CheckCircle2, ChevronRight, CircleHelp, Copy, Database, Download, RotateCcw, Play, Server, ShieldCheck, Terminal, Users, Wifi, XCircle } from "lucide-react";
import { allPowerShellSteps, createVirtualServer, executePowerShell, powerShellUnits, type VirtualServer } from "@/lib/powershell-simulator";
import "./powershell.css";

type TerminalLine = { command: string; output: string; error?: boolean };
const STORAGE = "klybit:windows-server:powershell:v1";
const translations: Record<string, string> = {
  help:"با Get-Help معنی دستور، پارامترها و نحوه استفاده را یاد بگیر. برای جزئیات واقعی از -Examples و -Full استفاده می‌شود.",
  commands:"Get-Command فهرست دستورات موجود را نشان می‌دهد. علامت * یعنی جست‌وجو با الگو.",
  system:"پیش از تغییر سرور، نسخه سیستم‌عامل، Hostname و عضویت در Domain را بررسی کن.",
  services:"وضعیت سرویس WinRM را مشاهده کن؛ این سرویس برای مدیریت از راه دور ویندوز استفاده می‌شود.",
  hostname:"نام سیستم‌عامل ویندوز را تغییر بده. نام ماشین مجازی Hyper-V با نام ویندوز یکسان نیست.",
  restart:"تغییر نام با راه‌اندازی مجدد اعمال می‌شود. اینجا فقط سرور مجازی داخل مرورگر تغییر می‌کند.",
  ip:"برای سرور، آدرس IPv4 ثابت، Prefix و Default Gateway تنظیم کن.",
  dnsclient:"DNS Client را روی آدرس سرویس DNS معتبر برای Domain تنظیم کن.",
  networkcheck:"با Get-NetIPAddress بررسی کن IP و Prefix واقعاً در وضعیت سرور مجازی ثبت شده‌اند.",
  features:"وضعیت نصب Role و Feature را قبل از تغییرات مشاهده کن.",
  "adds-role":"نقش Active Directory Domain Services را نصب کن؛ نصب Role به‌تنهایی سرور را Domain Controller نمی‌کند.",
  forest:"یک Forest و Domain آموزشی ایجاد کن. در محیط واقعی رمز DSRM، پیش‌نیازها و Restart ضروری‌اند.",
  domain:"با Get-ADDomain وجود Domain و اطلاعات آن را تأیید کن.",
  ou:"یک Organizational Unit برای سازماندهی کاربران بساز. Group Policy می‌تواند به OU لینک شود.",
  group:"یک Global Security Group برای دسترسی کارکنان بخش حسابداری بساز.",
  user:"یک حساب کاربری بساز. این نمونه ابتدا غیرفعال است؛ در محیط واقعی تعیین رمز امن و فعال‌سازی مراحل جداگانه‌اند.",
  membership:"کاربر را عضو Security Group کن؛ سپس دسترسی‌ها را به گروه بده، نه مستقیم به هر کاربر.",
  verifyuser:"حساب را از Active Directory بخوان و مشخصات آن را بررسی کن.",
  dnszone:"Zone مربوط به Domain را ببین و مطمئن شو DNS درست ایجاد شده است.",
  dnsrecord:"یک DNS A Record بساز تا نام intranet به IPv4 سرور اشاره کند.",
  resolve:"با Resolve-DnsName صحت Name Resolution را آزمایش کن.",
  dhcprole:"نقش DHCP Server را نصب کن؛ هنوز هیچ محدوده IP تخصیص داده نشده است.",
  dhcpauth:"سرور DHCP را در Active Directory مجاز کن تا DHCP غیرمجاز وارد شبکه نشود.",
  dhcpscope:"یک Scope برای تخصیص خودکار IP به کلاینت‌ها تعریف کن.",
  dhcpverify:"محدوده IP، نام Scope و پیکربندی آن را مشاهده کن.",
  folder:"در درایو D: پوشه اشتراکی بخش حسابداری بساز.",
  share:"SMB Share ایجاد کن. Permission اشتراک و Permission فایل‌سیستم NTFS هر دو مهم‌اند.",
  acl:"به گروه حسابداری مجوز Modify روی پوشه و زیرپوشه‌های NTFS بده؛ اصل Least Privilege را رعایت کن.",
  shares:"با Get-SmbShare مطمئن شو پوشه و نام Share ثبت شده‌اند.",
  firewall:"سه پروفایل Domain، Private و Public را بررسی کن. غیرفعال کردن کامل Firewall راه‌حل مناسب نیست.",
  rule:"برای پورت ۸۰۸۰ فقط در Domain Profile قانون ورودی تعریف کن؛ در محیط واقعی RemoteAddress را هم محدود کن.",
  verifyrule:"وجود و فعال بودن قانون Firewall را بررسی کن.",
  defender:"وضعیت حفاظت Real-Time و Antivirus ویندوز دیفندر را بخوان.",
  iis:"IIS Web Server را روی سرور نصب کن.",
  startiis:"سرویس IIS را Start کن و وضعیت آن را تغییر بده.",
  events:"Event Log سیستم را برای عیب‌یابی سرویس‌ها و خطاها بررسی کن.",
  backupfeature:"قابلیت Windows Server Backup را نصب کن.",
  backup:"یک Backup آموزشی ثبت کن؛ این خروجی فایل پشتیبان واقعی و قابل Restore تولید نمی‌کند.",
  versions:"تاریخچه Backupها را ببین و در محیط واقعی آزمایش Restore را نیز انجام بده."
};
const safeRestore = (): VirtualServer => {
  if (typeof window === "undefined") return createVirtualServer();
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE) || "null") as VirtualServer | null;
    if (saved && typeof saved.hostname === "string" && Array.isArray(saved.completed) && Array.isArray(saved.features) && Array.isArray(saved.users)) return saved;
  } catch { /* Corrupted progress should not break the lab. */ }
  return createVirtualServer();
};

export default function WindowsPowerShellPage() {
  // Keep the server render deterministic; browser-local progress is restored after mount.
  const [server, setServer] = useState<VirtualServer>(createVirtualServer);
  const [hydrated, setHydrated] = useState(false);
  const [unit, setUnit] = useState(powerShellUnits[0].id);
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<TerminalLine[]>([]);
  const [lastError, setLastError] = useState("");
  const [showHint, setShowHint] = useState(true);
  const [historyCursor, setHistoryCursor] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServer(safeRestore());
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem(STORAGE, JSON.stringify(server)); }, [server, hydrated]);
  useEffect(() => { outputRef.current?.scrollTo({top:outputRef.current.scrollHeight,behavior:"smooth"}); }, [history]);
  const selectedUnit = powerShellUnits.find(x => x.id === unit) || powerShellUnits[0];
  const completed = useMemo(() => new Set(server.completed), [server.completed]);
  const completedCount = allPowerShellSteps.filter(s => completed.has(s.id)).length;
  const unitDone = selectedUnit.steps.filter(s => completed.has(s.id)).length;
  const next = selectedUnit.steps.find(s=>!completed.has(s.id));
  const completion = Math.round(completedCount / allPowerShellSteps.length * 100);
  const run = (source?: string) => {
    const command = (source ?? draft).trim();
    if (!command) return;
    const result = executePowerShell(server, command);
    setServer(result.state);
    setHistory(prev => [...prev.slice(-69), {command,output:result.error || result.output,error:Boolean(result.error)}]);
    setLastError(result.error || "");
    setDraft("");
    setHistoryCursor(-1);
    inputRef.current?.focus();
  };
  const choose = (command: string) => {setDraft(command);inputRef.current?.focus();};
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if(event.key === "Enter" && !event.shiftKey) {event.preventDefault();run();}
    if(event.key === "ArrowUp" && !draft.trim()) {
      const commands=history.map(x=>x.command);
      if(commands.length){event.preventDefault();const index=historyCursor<0?commands.length-1:Math.max(0,historyCursor-1);setHistoryCursor(index);setDraft(commands[index]);}
    }
  };
  const reset = () => {
    if (window.confirm("Reset ALL virtual server changes and PowerShell lesson progress?")) {
      setServer(createVirtualServer());setHistory([]);setDraft("");setLastError("");setUnit(powerShellUnits[0].id);
    }
  };
  const exportProgress = () => {
    const json = JSON.stringify({name:"Klybit PowerShell virtual lab",exportedAt:new Date().toISOString(),server},null,2);
    const url=URL.createObjectURL(new Blob([json],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download="klybit-powershell-progress.json";link.click();URL.revokeObjectURL(url);
  };
  return <main className="ps-course" dir="rtl">
    <header className="ps-topbar" dir="ltr">
      <a href="/" className="ps-brand"><Terminal size={22}/><strong>KLYBIT</strong><span>/ WINDOWS SERVER / POWERSHELL</span></a>
      <div className="ps-top-actions">
        <span className="ps-sim-label"><ShieldCheck size={15}/> SAFE VIRTUAL LAB</span>
        <a href="/" className="ps-outline"><ArrowLeft size={16}/> Back to Windows Server</a>
      </div>
    </header>

    <section className="ps-hero">
      <div className="ps-kicker"><Terminal size={18}/> Windows Server 2025 · PowerShell Training Lab</div>
      <h1>آموزش عملی <span>PowerShell</span> برای Windows Server</h1>
      <p>از اولین دستور تا مدیریت Domain، کاربران، شبکه، DNS، DHCP، فایل‌سرور، امنیت و Backup. دستور را خودت وارد کن؛ سرور مجازی تغییر می‌کند و نتیجه را همان‌جا می‌بینی.</p>
      <div className="ps-warning"><ShieldCheck size={19}/><span>این یک <b>شبیه‌ساز آموزشی محلی در مرورگر</b> است؛ هیچ دستوری روی Windows Server واقعی یا دستگاه تو اجرا نمی‌شود. تنها دستورات فهرست‌شده پشتیبانی می‌شوند.</span></div>
      <div className="ps-overview">
        <div><strong>{powerShellUnits.length}</strong><small>فصل مرحله‌ای</small></div>
        <div><strong>{allPowerShellSteps.length}</strong><small>تمرین دستوری</small></div>
        <div><strong>{completedCount}</strong><small>تمرین تکمیل‌شده</small></div>
        <div><strong>{completion}%</strong><small>پیشرفت آموزشی</small></div>
      </div>
      <div className="ps-progressbar" role="progressbar" aria-label="Course progress" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}><span style={{width:completion+"%"}}/></div>
    </section>

    <div className="ps-layout">
      <aside className="ps-sidebar">
        <div className="ps-sidebar-head"><BookOpen size={19}/> مسیر یادگیری</div>
        <nav aria-label="PowerShell learning units">
          {powerShellUnits.map((item, i)=>{
            const done=item.steps.filter(s=>completed.has(s.id)).length;
            return <button key={item.id} type="button" onClick={()=>{setUnit(item.id);setLastError("");}} className={"ps-unit "+(unit===item.id?"active":"")} aria-current={unit===item.id?"step":undefined}>
              <span className="ps-unit-number">{done===item.steps.length?<Check size={16}/>:String(i+1).padStart(2,"0")}</span>
              <span><b dir="ltr">{item.name.replace(/^\d+ · /,"")}</b><small>{done} / {item.steps.length} مرحله</small></span>
              <ChevronRight size={15}/>
            </button>;
          })}
        </nav>
        <div className="ps-side-links"><button onClick={exportProgress} type="button"><Download size={16}/> خروجی پیشرفت (JSON)</button><button onClick={reset} type="button"><RotateCcw size={16}/> بازنشانی سرور مجازی</button></div>
      </aside>

      <section className="ps-workflow">
        <div className="ps-section-heading"><div><small>فصل {powerShellUnits.findIndex(x=>x.id===unit)+1} از {powerShellUnits.length}</small><h2 dir="ltr">{selectedUnit.name}</h2><p dir="ltr">{selectedUnit.goal}</p></div><span>{unitDone} / {selectedUnit.steps.length}</span></div>
        <ol className="ps-steps">
          {selectedUnit.steps.map((item,i)=><li className={"ps-step "+(completed.has(item.id)?"done":"")} key={item.id}>
            <div className="ps-step-head">
              <span className="ps-check">{completed.has(item.id)?<Check size={17}/>:String(i+1).padStart(2,"0")}</span>
              <h3 dir="ltr">{item.title}</h3>
              {completed.has(item.id)&&<span className="ps-completed">تکمیل شد</span>}
            </div>
            <p className="ps-farsi">{translations[item.id]}</p>
            <p dir="ltr" className="ps-English">{item.explanation}</p>
            <div className="ps-code-row" dir="ltr"><code>{item.command}</code><button type="button" onClick={()=>choose(item.command)} title="Insert command into terminal" aria-label={"Insert "+item.command}><Copy size={15}/> وارد کردن</button></div>
            <div className="ps-step-footer"><div><CircleHelp size={15}/> نتیجه مورد انتظار: {item.result}</div><a href={item.docs} target="_blank" rel="noopener noreferrer">Microsoft Learn ↗</a></div>
          </li>)}
        </ol>
        <div className="ps-next"><button type="button" disabled={powerShellUnits.findIndex(x=>x.id===unit)===0} onClick={()=>setUnit(powerShellUnits[powerShellUnits.findIndex(x=>x.id===unit)-1].id)}>فصل قبلی</button><button type="button" disabled={powerShellUnits.findIndex(x=>x.id===unit)===powerShellUnits.length-1} onClick={()=>setUnit(powerShellUnits[powerShellUnits.findIndex(x=>x.id===unit)+1].id)}>فصل بعدی ←</button></div>
      </section>

      <aside className="ps-console-column">
        <section className="ps-terminal">
          <div className="ps-terminal-bar" dir="ltr"><span className="ps-terminal-icon"><Terminal size={16}/></span><b>Administrator: Windows PowerShell</b><span className="ps-terminal-dots"><i/><i/><i/></span></div>
          <div className="ps-console" ref={outputRef} role="log" aria-label="Simulated PowerShell output" aria-live="polite" dir="ltr">
            <div className="ps-motd">Windows PowerShell · Klybit Training Edition</div>
            <div className="ps-muted">Copyright (C) Microsoft Corporation. Example training output only.</div>
            <div className="ps-muted">Try Get-Help Get-Service or select a guided command.</div>
            {history.map((line,index)=><div key={index} className="ps-history-line"><p><span>PS C:\&gt;</span> {line.command}</p><pre className={line.error?"ps-error":""}>{line.output}</pre></div>)}
          </div>
          <form className="ps-prompt" dir="ltr" onSubmit={event=>{event.preventDefault();run();}}>
            <label htmlFor="ps-command">PS C:\&gt;</label>
            <textarea id="ps-command" ref={inputRef} spellCheck={false} rows={2} value={draft} onKeyDown={keyDown} onChange={event=>setDraft(event.target.value)} placeholder="Type a PowerShell command... (Enter to run)" aria-label="Simulated PowerShell command"/>
            <button type="submit" disabled={!draft.trim()}><Play size={17}/> Run</button>
          </form>
          <div className="ps-console-bottom"><span>↵ اجرا · Shift+Enter خط بعد · ↑ دستور قبلی</span><button type="button" onClick={()=>setHistory([])}>پاک کردن خروجی</button></div>
        </section>
        <section className="ps-hint">
          <button type="button" onClick={()=>setShowHint(x=>!x)} className="ps-hint-toggle"><CircleHelp size={17}/> راهنمای مرحله بعد <span>{showHint?"−":"+"}</span></button>
          {showHint && (next ? <div><p dir="ltr">{next.title}</p><code dir="ltr">{next.command}</code><button type="button" onClick={()=>choose(next.command)}>فرستادن به ترمینال</button></div>:<p>این فصل تکمیل شده است. می‌توانی دستورهای دیگری را نیز امتحان کنی.</p>)}
          {lastError && <p className="ps-feedback" role="alert"><XCircle size={16}/> خطا را بخوان و پیش‌نیازهای دستور را بررسی کن.</p>}
        </section>
        <section className="ps-server-state">
          <h2><Server size={18}/> وضعیت Windows Server مجازی</h2>
          <div className="ps-server-grid">
            <div><small>Computer Name</small><strong dir="ltr">{server.hostname}</strong></div>
            <div><small>IPv4 Address</small><strong dir="ltr">{server.ipv4}</strong></div>
            <div><small>DNS Server</small><strong dir="ltr">{server.dns}</strong></div>
            <div><small>Domain</small><strong dir="ltr">{server.domain || "WORKGROUP"}</strong></div>
          </div>
          <div className="ps-server-counters"><span><Database size={15}/>{server.features.length} Roles</span><span><Users size={15}/>{server.users.length} Users</span><span><Wifi size={15}/>{Object.keys(server.records).length} DNS</span><span><CheckCircle2 size={15}/>{server.backups} Backups</span></div>
          <div className="ps-server-lists"><p>نقش‌های نصب‌شده: <b dir="ltr">{server.features.join(", ") || "None"}</b></p><p>گروه‌های AD: <b dir="ltr">{server.groups.join(", ") || "None"}</b></p><p>اشتراک‌های SMB: <b dir="ltr">{server.shares.map(s=>s.name).join(", ") || "None"}</b></p></div>
        </section>
      </aside>
    </div>
    <footer className="ps-footer"><span>Klybit Windows Server PowerShell · Educational simulation only</span><span>دستورات واقعی را ابتدا در یک VM ایزوله آزمایش کن، نه روی Production.</span></footer>
  </main>;
}
