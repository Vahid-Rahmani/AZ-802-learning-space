import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
const scratch = mkdtempSync(path.resolve(".tmp-linux-ui-"));
try {
  const outfile = path.join(scratch, "ui.mjs");
  await build({ stdin: { contents: 'export { LinuxWorkspace } from "./app/linux/page.tsx";', resolveDir: process.cwd(), loader: "tsx" }, outfile, bundle: true, format: "esm", platform: "neutral", target: "es2022", jsx: "automatic", external: ["react", "react/jsx-runtime", "lucide-react"], tsconfig: "tsconfig.json", logLevel: "warning", plugins: [{ name: "translation-fixture", setup(b) {
    b.onResolve({filter:/google-translate$/}, () => ({path:"translation",namespace:"fixture"}));
    b.onLoad({filter:/.*/,namespace:"fixture"}, () => ({contents:'export const GoogleSubtitle = ({text}) => text; export const GoogleSubtitleProvider = ({children}) => children; export const GoogleTranslateControl = () => null;',loader:"js"}));
  } }] });
  const dom = new JSDOM("<html><body></body></html>", {url:"http://localhost/linux",pretendToBeVisual:true});
  const {window} = dom;
  for (const [key,value] of Object.entries({window,document:window.document,HTMLElement:window.HTMLElement,HTMLInputElement:window.HTMLInputElement,Element:window.Element,Node:window.Node,localStorage:window.localStorage,navigator:window.navigator,Event:window.Event,requestAnimationFrame:window.requestAnimationFrame.bind(window),cancelAnimationFrame:window.cancelAnimationFrame.bind(window)})) Object.defineProperty(globalThis,key,{value,configurable:true});
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const {act,createElement} = await import("react");
  const {createRoot} = await import("react-dom/client");
  const {LinuxWorkspace} = await import(pathToFileURL(outfile).href);
  const settle = () => act(async()=>{await new Promise(r=>setTimeout(r,5));});
  let container, root;
  async function mount(user="test-linux") {
    container=document.createElement("div"); document.body.appendChild(container); root=createRoot(container);
    await act(async()=>root.render(createElement(LinuxWorkspace,{userId:user}))); await settle();
  }
  const input=()=>container.querySelector("#linux-command");
  async function type(value) { await act(async()=>{ Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set.call(input(),value); input().dispatchEvent(new window.Event("input",{bubbles:true})); }); }
  async function command(value) { await type(value); await act(async()=>container.querySelector("form").dispatchEvent(new window.Event("submit",{bubbles:true,cancelable:true}))); await settle(); }
  async function unmount() {await act(async()=>root.unmount());container.remove();}
  await mount();
  assert.equal(container.querySelector("progress").value,0);
  for(const value of ["pwd","whoami","ls -la","pwd"]) await command(value);
  assert.equal(container.querySelector("progress").value,0,"read-only commands forged progress");
  for(const value of ["mkdir -p ~/practice","cd ~/practice","touch notes.txt"]) await command(value);
  assert.equal(container.querySelectorAll(".linux-checks .is-passed").length,3);
  await command('echo "Linux practice" > notes.txt'); await command("chmod 640 notes.txt");
  await command("sudo dnf install httpd"); await command("sudo systemctl start httpd"); await command("sudo systemctl enable httpd");
  await command("mkdir -p config"); await command('echo "ServerName training-rhel" > config/httpd.conf'); await command("cp config/httpd.conf config/httpd.conf.bak"); await command("chmod 600 config/httpd.conf.bak");
  assert.equal(container.querySelector("progress").value,100);
  await command("sudo systemctl stop httpd"); assert.ok(container.querySelector("progress").value<100);
  await command("sudo systemctl start httpd"); assert.equal(container.querySelector("progress").value,100);
  await act(async()=>input().dispatchEvent(new window.KeyboardEvent("keydown",{key:"ArrowUp",bubbles:true})));
  assert.equal(input().value,"sudo systemctl start httpd");
  assert.equal(input().getAttribute("autocapitalize"),"none");
  assert.equal(input().getAttribute("inputmode"),"text");
  await act(async()=>input().dispatchEvent(new window.KeyboardEvent("keydown",{key:"l",ctrlKey:true,bubbles:true})));
  assert.equal(container.querySelectorAll(".linux-terminal-entry").length,0);
  assert.equal(container.querySelector("progress").value,100,"clearing transcript reset configuration");
  await unmount(); await mount();
  assert.equal(container.querySelector("progress").value,100,"resume lost device state");
  window.confirm=()=>true;
  await act(async()=>container.querySelector(".linux-workspace-bar button").click()); await settle();
  assert.equal(container.querySelector("progress").value,0,"reset kept solved goals");
  await unmount(); await mount("other-linux"); assert.equal(container.querySelector("progress").value,0); await unmount();
  const css=readFileSync("app/linux/linux.css","utf8");
  assert.match(css,/linux-terminal-screen[^}]*height:[^}]*overflow: auto/s,"terminal isn't bounded and scrollable");
  console.log("Linux React UI: actual command submissions, state ticks/fault reversal, history, clear, resume, reset, account isolation and mobile input attributes passed. Auth/translation are fixtures; browser geometry is checked separately.");
} finally { rmSync(scratch,{recursive:true,force:true}); }
