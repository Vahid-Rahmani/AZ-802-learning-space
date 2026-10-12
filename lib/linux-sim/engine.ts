/** Browser-only educational model. Never executes a shell, accesses a host file,
 * authenticates a user, downloads a package, or sends network traffic.
 * Syntax references: GNU Coreutils/Bash manuals and Red Hat's RHEL 10
 * DNF, systemd, and networking documentation. Only the documented subset below
 * is implemented; this is not an installed Red Hat Enterprise Linux system.
 */
export type LinuxUser = "learner" | "root";
export type LinuxNode = {
  kind: "file" | "directory";
  content: string;
  mode: number;
  owner: LinuxUser;
  group: string;
};
export type LinuxService = { package: string; running: boolean; enabled: boolean };
export type LinuxSession = {
  version: 1;
  user: "learner";
  hostname: "training-rhel";
  cwd: string;
  previousCwd: string;
  files: Record<string, LinuxNode>;
  packages: Record<string, boolean>;
  services: Record<string, LinuxService>;
  interfaces: Record<string, { address: string; up: boolean }>;
  commandCount: number;
};
export type LinuxCommandResult = { session: LinuxSession; output: string[]; exitCode: number };

const HOME = "/home/learner";
const MAX_FILES = 512;
const MAX_CONTENT = 65_536;
const MAX_TOTAL_CONTENT = 1_048_576;
const PACKAGE_DESCRIPTIONS: Record<string, string> = {
  bash: "Shell (educational subset)", coreutils: "Basic file utilities",
  grep: "Text search", dnf: "Package management model", systemd: "Service management model",
  iproute: "Network interface inspection", iputils: "Simulated connectivity checks",
  "openssh-server": "SSH server", NetworkManager: "Network management",
  chrony: "Time synchronization", firewalld: "Firewall service",
  httpd: "Apache HTTP server", nginx: "Nginx HTTP server", "vim-enhanced": "Vim package (editor not simulated)",
};
const SERVICE_PACKAGES: Record<string, string> = {
  sshd: "openssh-server", NetworkManager: "NetworkManager", chronyd: "chrony",
  firewalld: "firewalld", httpd: "httpd", nginx: "nginx",
};
export const LINUX_HELP: Record<string, string[]> = {
  pwd: ["pwd", "Print the current virtual directory."],
  ls: ["ls [-lah] [PATH ...]", "List virtual files. -l shows modes and owners; -a includes hidden entries; -h abbreviates sizes."],
  cd: ["cd [PATH|-]", "Change directory. Supports /, relative paths, .., ~, and the previous directory (-)."],
  mkdir: ["mkdir [-p] PATH ...", "Create directories. -p also creates missing parents."],
  touch: ["touch FILE ...", "Create an empty file; existing file contents are preserved. Timestamps are not modeled."],
  cat: ["cat FILE ...", "Read virtual text files."],
  echo: ["echo [-n] TEXT [> FILE | >> FILE]", "Quotes group text. > replaces contents; >> appends. No variable or command expansion."],
  cp: ["cp [-r] SOURCE DEST", "Copy a file, or a directory with -r. Exactly one source is supported."],
  mv: ["mv SOURCE DEST", "Move or rename a virtual file or directory. Exactly one source is supported."],
  rm: ["rm [-rf] PATH ...", "Delete virtual files. -r deletes directory contents. Root and the current/previous directory's ancestors are protected."],
  chmod: ["chmod MODE PATH ...", "Set ordinary octal permissions, e.g. 640 or 0755. Symbolic and special modes are not supported."],
  grep: ["grep [-Finv] PATTERN FILE ...", "Literal text matching only; -i ignores case, -n numbers lines, -v inverts matches. Regex is not implemented."],
  whoami: ["whoami", "Show learner, or root inside a simulated sudo command."],
  id: ["id", "Display the modeled identity and groups."],
  hostname: ["hostname", "Display the fixed virtual hostname."],
  uname: ["uname [-a|-r|-s|-n|-m]", "Show clearly labeled simulated system information."],
  dnf: ["dnf list [--installed|installed] [PACKAGE]", "dnf search TEXT", "sudo dnf [-y] install|remove PACKAGE ...", "Known packages only; no downloads, repositories, dependencies, updates, or executable installation."],
  systemctl: ["systemctl status UNIT", "sudo systemctl start|stop|restart|enable|disable UNIT", "sudo systemctl enable|disable --now UNIT", "Starting and boot enablement are separate. A unit requires its package."],
  ip: ["ip address [show] [dev INTERFACE]", "ip link [show] [dev INTERFACE]", "Read-only modeled interfaces. No network changes or traffic."],
  ping: ["ping [-c 1..5] HOST", "Simulated replies for localhost, training-rhel, gateway and their fixture addresses. No real network traffic."],
  sudo: ["sudo COMMAND ...", "Educational elevation for one supported command; no password or real authentication. Redirection still uses learner's permissions."],
  clear: ["clear", "The terminal view clears its displayed transcript."],
  help: ["help [COMMAND]", "List this model's supported commands or show their syntax."],
  man: ["man COMMAND", "Show the local educational command reference; full Linux man pages are not included."],
};

function node(kind: LinuxNode["kind"], owner: LinuxUser, content = "", mode = kind === "directory" ? 0o755 : 0o644): LinuxNode {
  return { kind, content, mode, owner, group: owner };
}

export function createLinuxSession(): LinuxSession {
  const files: LinuxSession["files"] = {};
  for (const path of ["/", "/home", "/etc", "/var", "/var/log", "/var/www", "/var/www/html", "/tmp", "/root"]) {
    files[path] = node("directory", "root", "", path === "/tmp" ? 0o777 : path === "/root" ? 0o700 : 0o755);
  }
  files[HOME] = node("directory", "learner");
  files[`${HOME}/.bashrc`] = node("file", "learner", "# Educational shell model; no executable startup scripts.\n");
  files[`${HOME}/README.txt`] = node("file", "learner", "Welcome to the browser-only Linux lab.\nAll files, packages, services and network replies are simulated.\nType help for the supported command subset.\n");
  files["/etc/os-release"] = node("file", "root", 'NAME="Educational RHEL-compatible model"\nID="linux-training-model"\nID_LIKE="rhel"\nPRETTY_NAME="Browser-only educational RHEL-compatible model (not an installed RHEL system)"\nSIMULATED="yes"\n');
  files["/etc/hostname"] = node("file", "root", "training-rhel\n");
  files["/etc/hosts"] = node("file", "root", "127.0.0.1 localhost\n192.0.2.10 training-rhel\n192.0.2.1 gateway\n");
  files["/etc/passwd"] = node("file", "root", "root:x:0:0:root:/root:/bin/bash\nlearner:x:1000:1000:Lab learner:/home/learner:/bin/bash\n");
  files["/var/log/messages"] = node("file", "root", "training-rhel: educational session ready\n", 0o640);
  const packages = Object.fromEntries(Object.keys(PACKAGE_DESCRIPTIONS).map((name) => [name, !["httpd", "nginx", "vim-enhanced"].includes(name)]));
  const services = Object.fromEntries(Object.entries(SERVICE_PACKAGES).map(([name, pkg]) => [name, { package: pkg, running: packages[pkg], enabled: packages[pkg] }]));
  return {
    version: 1, user: "learner", hostname: "training-rhel", cwd: HOME, previousCwd: HOME,
    files, packages, services,
    interfaces: { lo: { address: "127.0.0.1/8", up: true }, enp1s0: { address: "192.0.2.10/24", up: true } },
    commandCount: 0,
  };
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function canonical(path: string): boolean {
  return path === "/" || (path.startsWith("/") && !path.endsWith("/") && !path.includes("//")
    && path.split("/").slice(1).every((part) => part !== "." && part !== ".." && part.length > 0));
}
function parent(path: string): string { return path.slice(0, path.lastIndexOf("/")) || "/"; }
function basename(path: string): string { return path === "/" ? "/" : path.slice(path.lastIndexOf("/") + 1); }
function inside(path: string, directory: string): boolean { return path === directory || path.startsWith(directory === "/" ? "/" : `${directory}/`); }

/** Validate a bounded persisted model before restoring local browser storage. */
export function isLinuxSession(value: unknown): value is LinuxSession {
  try {
    if (!plainRecord(value) || value.version !== 1 || value.user !== "learner" || value.hostname !== "training-rhel"
      || !Number.isInteger(value.commandCount) || (value.commandCount as number) < 0 || (value.commandCount as number) > 1_000_000
      || typeof value.cwd !== "string" || typeof value.previousCwd !== "string"
      || !plainRecord(value.files) || !plainRecord(value.packages) || !plainRecord(value.services) || !plainRecord(value.interfaces)) return false;
    const entries = Object.entries(value.files);
    if (!entries.length || entries.length > MAX_FILES) return false;
    let bytes = 0;
    for (const [path, file] of entries) {
      if (!canonical(path) || path.length > 1024 || /[\x00-\x1f\x7f]/.test(path) || !plainRecord(file)
        || !["file", "directory"].includes(file.kind as string) || typeof file.content !== "string"
        || file.content.length > MAX_CONTENT || (file.kind === "directory" && file.content !== "")
        || !Number.isInteger(file.mode) || (file.mode as number) < 0 || (file.mode as number) > 0o777
        || !["root", "learner"].includes(file.owner as string) || file.group !== file.owner) return false;
      bytes += file.content.length;
      if (path !== "/" && (!plainRecord(value.files[parent(path)]) || (value.files[parent(path)] as Record<string, unknown>).kind !== "directory")) return false;
    }
    if (bytes > MAX_TOTAL_CONTENT || (value.files["/"] as LinuxNode)?.kind !== "directory"
      || (value.files[value.cwd] as LinuxNode)?.kind !== "directory" || (value.files[value.previousCwd] as LinuxNode)?.kind !== "directory") return false;
    if (Object.keys(value.packages).length !== Object.keys(PACKAGE_DESCRIPTIONS).length
      || Object.keys(value.packages).some((key) => !Object.hasOwn(PACKAGE_DESCRIPTIONS, key) || typeof (value.packages as Record<string, unknown>)[key] !== "boolean")) return false;
    if (Object.keys(value.services).length !== Object.keys(SERVICE_PACKAGES).length) return false;
    for (const [name, service] of Object.entries(value.services)) {
      if (!Object.hasOwn(SERVICE_PACKAGES, name) || !plainRecord(service) || service.package !== SERVICE_PACKAGES[name]
        || typeof service.running !== "boolean" || typeof service.enabled !== "boolean"
        || (!(value.packages as Record<string, unknown>)[service.package as string] && (service.running || service.enabled))) return false;
    }
    if (Object.keys(value.interfaces).length !== 2) return false;
    for (const [name, intf] of Object.entries(value.interfaces)) {
      if (!plainRecord(intf) || !["lo", "enp1s0"].includes(name) || typeof intf.up !== "boolean"
        || intf.address !== (name === "lo" ? "127.0.0.1/8" : "192.0.2.10/24")) return false;
    }
    return true;
  } catch { return false; }
}

export function linuxPrompt(session: LinuxSession): string {
  const cwd = session.cwd === HOME ? "~" : basename(session.cwd);
  return `[learner@${session.hostname} ${cwd}]$`;
}

class CommandError extends Error {
  exitCode: number;
  constructor(message: string, exitCode = 1) { super(message); this.exitCode = exitCode; }
}
function fail(message: string, exitCode = 1): never { throw new CommandError(message, exitCode); }
type Token = { value: string; operator: boolean; quoted: boolean };
function tokenize(line: string): Token[] {
  if (line.length > 4096) fail("shell: command exceeds the 4096-character educational limit", 2);
  if (/[\x00-\x1f\x7f]/.test(line)) fail("shell: control characters and multiline commands are not supported", 2);
  const tokens: Token[] = [];
  let word = "", started = false, quoted = false, quote = "";
  const flush = () => { if (started) tokens.push({ value: word, operator: false, quoted }); word = ""; started = false; quoted = false; };
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quote) {
      if (char === quote) { quote = ""; continue; }
      if (quote === '"' && (char === "$" || char === "`")) fail("shell: variable and command expansion are not supported", 2);
      if (quote === '"' && char === "\\" && ['"', "\\", "$", "`"].includes(line[i + 1])) { word += line[++i]; continue; }
      word += char; continue;
    }
    if (char === "'" || char === '"') { quote = char; started = true; quoted = true; continue; }
    if (char === "\\") { if (i + 1 >= line.length) fail("shell: unfinished escape", 2); started = true; quoted = true; word += line[++i]; continue; }
    if (/\s/.test(char)) { flush(); continue; }
    if (char === "#" && !started) break;
    if ("$`*?[{}()".includes(char)) fail("shell: expansion, globs and shell expressions are not supported; quote literal text", 2);
    if (">|;&<".includes(char)) {
      flush(); let operator = char;
      if (char === ">" && line[i + 1] === ">") { operator = ">>"; i++; }
      tokens.push({ value: operator, operator: true, quoted: false }); continue;
    }
    started = true; word += char;
  }
  if (quote) fail("shell: unmatched quote", 2);
  flush(); return tokens;
}
function pathOf(session: LinuxSession, input: string, user: LinuxUser, expandTilde = false, creatingDirectory = false): string {
  if (!input) fail("shell: empty path");
  let raw = input;
  if (expandTilde && (raw === "~" || raw.startsWith("~/"))) raw = `${HOME}${raw.slice(1)}`;
  if (expandTilde && raw.startsWith("~")) fail("shell: only the learner's ~ home shortcut is supported", 2);
  const parts = (raw.startsWith("/") ? raw : `${session.cwd}/${raw}`).split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    const current = `/${stack.join("/")}`;
    const currentNode = session.files[current];
    if (currentNode) {
      if (currentNode.kind !== "directory") fail(`${input}: Not a directory`);
      if (!permitted(currentNode, user, 1)) fail(`${input}: Permission denied`);
    }
    if (part === "..") {
      if (!currentNode) fail(`${input}: No such file or directory`);
      stack.pop();
    } else stack.push(part);
  }
  const path = `/${stack.join("/")}`;
  if (path.length > 1024) fail("shell: path exceeds the educational limit");
  if (raw.endsWith("/") && session.files[path]?.kind === "file") fail(`${input}: Not a directory`);
  if (raw.endsWith("/") && !session.files[path] && !creatingDirectory) fail(`${input}: No such directory`);
  return path;
}
function permitted(file: LinuxNode, user: LinuxUser, bit: number): boolean {
  if (user === "root") return true;
  const shift = file.owner === user ? 6 : file.group === "learner" ? 3 : 0;
  return ((file.mode >> shift) & bit) === bit;
}
function access(session: LinuxSession, path: string, user: LinuxUser, bit: number): LinuxNode {
  const ancestors = path.split("/").slice(1, -1);
  let traversed = "/";
  for (const part of ["", ...ancestors]) {
    if (part) traversed = traversed === "/" ? `/${part}` : `${traversed}/${part}`;
    const directory = session.files[traversed];
    if (!directory) fail(`${path}: No such file or directory`);
    if (directory.kind !== "directory") fail(`${path}: Not a directory`);
    if (!permitted(directory, user, 1)) fail(`${path}: Permission denied`);
  }
  const file = session.files[path];
  if (!file) fail(`${path}: No such file or directory`);
  if (!permitted(file, user, bit)) fail(`${path}: Permission denied`);
  return file;
}
function writableParent(session: LinuxSession, path: string, user: LinuxUser): void {
  const directory = access(session, parent(path), user, 3);
  if (directory.kind !== "directory") fail(`${parent(path)}: Not a directory`);
}
function writeFile(session: LinuxSession, path: string, content: string, user: LinuxUser, append = false): void {
  const existing = session.files[path];
  if (existing) {
    access(session, path, user, 2);
    if (existing.kind === "directory") fail(`${path}: Is a directory`);
  } else writableParent(session, path, user);
  const next = (append ? existing?.content ?? "" : "") + content;
  if (next.length > MAX_CONTENT) fail(`${path}: educational file size limit exceeded`);
  if (existing) existing.content = next;
  else session.files[path] = node("file", user, next);
}
function contentLines(content: string): string[] { return content === "" ? [] : content.replace(/\n$/, "").split("\n"); }
function modes(file: LinuxNode): string {
  let text = file.kind === "directory" ? "d" : "-";
  for (const shift of [6, 3, 0]) for (const [bit, char] of [[4, "r"], [2, "w"], [1, "x"]] as const) text += ((file.mode >> shift) & bit) ? char : "-";
  return text;
}
function displaySize(size: number, human: boolean): string {
  if (!human || size < 1024) return String(size);
  return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)}K`;
}
function parseOptions(args: string[], allowed: string, command: string): { flags: Set<string>; operands: string[] } {
  const flags = new Set<string>(), operands: string[] = [];
  let ended = false;
  for (const arg of args) {
    if (!ended && arg === "--") { ended = true; continue; }
    if (!ended && arg.startsWith("-") && arg !== "-") {
      if (arg.startsWith("--")) fail(`${command}: unsupported option '${arg}'`, 2);
      for (const flag of arg.slice(1)) { if (!allowed.includes(flag)) fail(`${command}: unsupported option '-${flag}'`, 2); flags.add(flag); }
    } else operands.push(arg);
  }
  return { flags, operands };
}
function count(args: string[], min: number, max: number, usage: string): void {
  if (args.length < min || args.length > max) fail(`usage: ${usage}`, 2);
}
function noOptions(args: string[], command: string): void {
  if (args.some((arg) => arg.startsWith("-") && arg !== "-")) fail(`${command}: unsupported option; see help ${command}`, 2);
}
function rootRequired(user: LinuxUser, command: string): void {
  if (user !== "root") fail(`${command}: Permission denied; use sudo for this simulated administrative operation`);
}
type CommandOutput = { text: string; exitCode?: number };

function execute(session: LinuxSession, command: string, args: string[], user: LinuxUser): CommandOutput {
  const result = (lines: string[] = []): CommandOutput => ({ text: lines.length ? `${lines.join("\n")}\n` : "" });
  const path = (value: string) => pathOf(session, value, user);
  switch (command) {
    case "help": case "man": {
      count(args, command === "man" ? 1 : 0, 1, `${command} ${command === "man" ? "COMMAND" : "[COMMAND]"}`);
      if (args.length) {
        if (!Object.hasOwn(LINUX_HELP, args[0])) fail(`${command}: no educational reference for '${args[0]}'`);
        return result(LINUX_HELP[args[0]]);
      }
      return result(["Browser-only educational Linux model. Supported commands:", Object.keys(LINUX_HELP).join("  "), "Use help COMMAND for exact syntax. Pipes, scripts, expansions, editors and real networking are not supported."]);
    }
    case "pwd": count(args, 0, 0, "pwd"); return result([session.cwd]);
    case "clear": count(args, 0, 0, "clear"); return result();
    case "whoami": count(args, 0, 0, "whoami"); return result([user]);
    case "id": count(args, 0, 0, "id"); return result([user === "root" ? "uid=0(root) gid=0(root) groups=0(root) [simulated]" : "uid=1000(learner) gid=1000(learner) groups=1000(learner),10(wheel) [simulated]"]);
    case "hostname": count(args, 0, 0, "hostname"); return result([session.hostname]);
    case "uname": {
      count(args, 0, 1, "uname [-a|-r|-s|-n|-m]");
      const values: Record<string, string> = { "-a": `Linux ${session.hostname} educational-model x86_64 (browser simulation; no running kernel)`, "-r": "educational-model (simulated)", "-s": "Linux (simulated)", "-n": session.hostname, "-m": "x86_64 (simulated)" };
      const flag = args[0] ?? "-s";
      if (!Object.hasOwn(values, flag)) fail(`uname: unsupported option '${flag}'`, 2);
      return result([values[flag]]);
    }
    case "cd": {
      if (user === "root") fail("sudo: cd is a shell builtin; use cd directly", 2);
      count(args, 0, 1, "cd [PATH|-]"); noOptions(args, "cd");
      const target = args[0] === "-" ? session.previousCwd : path(args[0] ?? HOME);
      const directory = access(session, target, user, 1);
      if (directory.kind !== "directory") fail(`cd: ${args[0]}: Not a directory`);
      session.previousCwd = session.cwd; session.cwd = target;
      return result(args[0] === "-" ? [target] : []);
    }
    case "ls": {
      const { flags, operands } = parseOptions(args, "lah", "ls");
      const targets = operands.length ? operands : [session.cwd];
      const lines: string[] = [];
      for (const input of targets) {
        const target = path(input), file = access(session, target, user, 4);
        if (targets.length > 1) { if (lines.length) lines.push(""); lines.push(`${input}:`); }
        const entries: [string, string][] = file.kind === "file" ? [[target, input]] : Object.keys(session.files)
          .filter((entry) => entry !== target && parent(entry) === target && (flags.has("a") || !basename(entry).startsWith(".")))
          .sort().map((entry) => [entry, basename(entry)]);
        if (file.kind === "directory" && flags.has("l")) access(session, target, user, 5);
        if (file.kind === "directory" && flags.has("a")) entries.unshift([target, "."], [parent(target), ".."]);
        for (const [entry, display] of entries) {
          const item = session.files[entry];
          lines.push(flags.has("l") ? `${modes(item)} 1 ${item.owner} ${item.group} ${displaySize(item.kind === "file" ? item.content.length : 0, flags.has("h"))} ${display}` : display);
        }
      }
      return result(lines);
    }
    case "mkdir": {
      const { flags, operands } = parseOptions(args, "p", "mkdir"); count(operands, 1, 30, "mkdir [-p] PATH ...");
      for (const input of operands) {
        const target = pathOf(session, input, user, false, true);
        if (session.files[target]) {
          if (flags.has("p") && session.files[target].kind === "directory") { access(session, target, user, 1); continue; }
          fail(`mkdir: ${input}: File exists`);
        }
        const create = flags.has("p") ? target.split("/").slice(1).map((_, index, parts) => `/${parts.slice(0, index + 1).join("/")}`) : [target];
        for (const directory of create) {
          if (session.files[directory]) { if (session.files[directory].kind !== "directory") fail(`mkdir: ${directory}: Not a directory`); access(session, directory, user, 1); }
          else { writableParent(session, directory, user); session.files[directory] = node("directory", user); }
        }
      }
      return result();
    }
    case "touch": {
      const { operands } = parseOptions(args, "", "touch"); count(operands, 1, 30, "touch FILE ...");
      for (const input of operands) {
        const target = path(input);
        if (session.files[target]) access(session, target, user, 2);
        else writeFile(session, target, "", user);
      }
      return result();
    }
    case "cat": {
      const { operands } = parseOptions(args, "", "cat"); count(operands, 1, 30, "cat FILE ...");
      let text = "";
      for (const input of operands) { const file = access(session, path(input), user, 4); if (file.kind === "directory") fail(`cat: ${input}: Is a directory`); text += file.content; }
      return { text };
    }
    case "echo": {
      const end = args[0] === "-n" ? "" : "\n", words = end === "" ? args.slice(1) : args;
      if (words[0]?.startsWith("-")) fail(`echo: unsupported option '${words[0]}'`, 2);
      return { text: words.join(" ") + end };
    }
    case "chmod": {
      noOptions(args, "chmod"); count(args, 2, 31, "chmod OCTAL PATH ...");
      if (!/^0?[0-7]{3}$/.test(args[0])) fail("chmod: only ordinary octal modes 000..777 (optionally with a leading 0) are supported", 2);
      for (const input of args.slice(1)) {
        const file = access(session, path(input), user, 0);
        if (user !== "root" && file.owner !== user) fail(`chmod: ${input}: Operation not permitted`);
        file.mode = parseInt(args[0], 8);
      }
      return result();
    }
    case "cp": case "mv": {
      const { flags, operands } = parseOptions(args, command === "cp" ? "rR" : "", command);
      count(operands, 2, 2, `${command} ${command === "cp" ? "[-r] " : ""}SOURCE DEST`);
      const source = path(operands[0]), sourceFile = access(session, source, user, command === "cp" ? 4 : 0);
      let dest = path(operands[1]);
      if (session.files[dest]?.kind === "directory") dest = `${dest === "/" ? "" : dest}/${basename(source)}`;
      if (source === dest) fail(`${command}: source and destination are the same file`);
      if (sourceFile.kind === "directory" && inside(dest, source)) fail(`${command}: cannot place a directory inside itself`);
      if (sourceFile.kind === "directory" && command === "cp" && !flags.has("r") && !flags.has("R")) fail(`cp: -r not specified; omitting directory '${operands[0]}'`);
      if (source === "/" || (command === "mv" && (inside(session.cwd, source) || inside(session.previousCwd, source)))) fail(`${command}: protected virtual directory`);
      writableParent(session, dest, user);
      const destination = session.files[dest];
      if (destination && (destination.kind === "directory" || sourceFile.kind === "directory")) fail(`${command}: merging or replacing directories is not supported`, 2);
      if (destination && command === "cp") access(session, dest, user, 2);
      if (command === "mv") writableParent(session, source, user);
      const entries = Object.keys(session.files).filter((entry) => inside(entry, source));
      if (command === "cp") for (const entry of entries) access(session, entry, user, session.files[entry].kind === "directory" ? 5 : 4);
      for (const entry of entries) {
        const original = session.files[entry], target = `${dest}${entry.slice(source.length)}`;
        session.files[target] = command === "mv" ? { ...original } : { ...original, owner: user, group: user };
        if (entry === source && command === "cp" && destination) session.files[target] = { ...destination, content: original.content };
      }
      if (command === "mv") for (const entry of entries) delete session.files[entry];
      return result();
    }
    case "rm": {
      const { flags, operands } = parseOptions(args, "rfR", "rm"); count(operands, flags.has("f") ? 0 : 1, 30, "rm [-rf] PATH ...");
      for (const input of operands) {
        const target = path(input), file = session.files[target];
        if (!file) { if (flags.has("f")) continue; fail(`rm: ${input}: No such file or directory`); }
        if (target === "/" || inside(session.cwd, target) || inside(session.previousCwd, target)) fail(`rm: ${input}: protected virtual directory`);
        if (file.kind === "directory" && !flags.has("r") && !flags.has("R")) fail(`rm: ${input}: Is a directory (use -r)`);
        const entries = Object.keys(session.files).filter((entry) => inside(entry, target));
        for (const entry of entries) { writableParent(session, entry, user); if (session.files[entry].kind === "directory") access(session, entry, user, 5); }
        for (const entry of entries) delete session.files[entry];
      }
      return result();
    }
    case "grep": {
      const { flags, operands } = parseOptions(args, "Finv", "grep"); count(operands, 2, 31, "grep [-Finv] LITERAL FILE ...");
      const needle = flags.has("i") ? operands[0].toLowerCase() : operands[0], lines: string[] = [];
      for (const input of operands.slice(1)) {
        const file = access(session, path(input), user, 4); if (file.kind === "directory") fail(`grep: ${input}: Is a directory`);
        contentLines(file.content).forEach((line, index) => {
          const found = (flags.has("i") ? line.toLowerCase() : line).includes(needle);
          if (flags.has("v") ? !found : found) lines.push(`${operands.length > 2 ? `${input}:` : ""}${flags.has("n") ? `${index + 1}:` : ""}${line}`);
        });
      }
      return { ...result(lines), exitCode: lines.length ? 0 : 1 };
    }
    case "dnf": {
      const normalized = args.filter((arg) => arg !== "-y"), action = normalized[0], rest = normalized.slice(1);
      if (args.some((arg) => arg.startsWith("-") && !["-y", "--installed"].includes(arg))) fail("dnf: unsupported option; see help dnf", 2);
      if (action === "list") {
        const installedOnly = rest[0] === "installed" || rest[0] === "--installed", names = installedOnly ? rest.slice(1) : rest;
        count(names, 0, 1, "dnf list [--installed|installed] [PACKAGE]");
        if (names.length && !Object.hasOwn(PACKAGE_DESCRIPTIONS, names[0])) fail(`dnf: unknown package '${names[0]}' in the educational catalog`);
        const selected = Object.keys(session.packages).filter((name) => (!names.length || name === names[0]) && (!installedOnly || session.packages[name]));
        return result([installedOnly ? "Installed Packages (simulated)" : "Educational package catalog", ...selected.map((name) => `${name}.x86_64  educational  ${session.packages[name] ? "@installed" : "available"}`)]);
      }
      if (action === "search") {
        count(rest, 1, 1, "dnf search TEXT"); noOptions(rest, "dnf");
        const needle = rest[0].toLowerCase();
        return result(["Educational package catalog (no repository access)", ...Object.entries(PACKAGE_DESCRIPTIONS).filter(([name, description]) => `${name} ${description}`.toLowerCase().includes(needle)).map(([name, description]) => `${name}: ${description}`)]);
      }
      if (!["install", "remove"].includes(action)) fail("dnf: unsupported operation; see help dnf", 2);
      rootRequired(user, "dnf"); count(rest, 1, 30, "sudo dnf [-y] install|remove PACKAGE ..."); noOptions(rest, "dnf");
      for (const name of rest) if (!Object.hasOwn(PACKAGE_DESCRIPTIONS, name)) fail(`dnf: No match for argument: ${name} (educational catalog only)`);
      if (action === "remove" && rest.some((name) => ["bash", "coreutils", "grep", "dnf", "systemd", "iproute", "iputils"].includes(name))) fail("dnf: the educational model's core packages are protected");
      const lines = ["Simulated DNF transaction; no downloads or installed executables."];
      for (const name of rest) {
        const installed = action === "install";
        lines.push(session.packages[name] === installed ? `${name}: already ${installed ? "installed" : "absent"}.` : `${installed ? "Installed" : "Removed"}: ${name}`);
        session.packages[name] = installed;
        if (!installed) for (const service of Object.values(session.services)) if (service.package === name) { service.running = false; service.enabled = false; }
      }
      return result(lines);
    }
    case "systemctl": {
      const action = args[0], now = args.includes("--now"), rest = args.slice(1).filter((arg) => arg !== "--now");
      if (!["status", "start", "stop", "restart", "enable", "disable"].includes(action)) fail("systemctl: unsupported operation; see help systemctl", 2);
      if (args.filter((arg) => arg === "--now").length > 1 || (now && !["enable", "disable"].includes(action))) fail("systemctl: --now is supported only with enable or disable", 2);
      count(rest, 1, 1, "systemctl ACTION [--now] UNIT"); noOptions(rest, "systemctl");
      const name = rest[0].replace(/\.service$/, "");
      if (!Object.hasOwn(session.services, name) || !session.packages[session.services[name].package]) fail(`Unit ${name}.service could not be found.` , 4);
      const service = session.services[name];
      if (action === "status") return { ...result([`${name}.service - Educational service model`, `  Loaded: loaded (${service.enabled ? "enabled" : "disabled"})`, `  Active: ${service.running ? "active (running)" : "inactive (dead)"}`, "  State only; no real daemon is running."]), exitCode: service.running ? 0 : 3 };
      rootRequired(user, "systemctl");
      if (["start", "restart"].includes(action)) service.running = true;
      if (action === "stop") service.running = false;
      if (action === "enable" || action === "disable") { service.enabled = action === "enable"; if (now) service.running = action === "enable"; }
      return result();
    }
    case "ip": {
      const family = args[0], rest = args.slice(1);
      if (!["address", "addr", "a", "link"].includes(family)) fail("ip: only address show and link show are supported", 2);
      if (rest[0] === "show") rest.shift();
      let names = Object.keys(session.interfaces);
      if (rest.length) {
        count(rest, 2, 2, `ip ${family} [show] [dev INTERFACE]`);
        if (rest[0] !== "dev" || !Object.hasOwn(session.interfaces, rest[1])) fail("ip: unknown interface or unsupported syntax", 2);
        names = [rest[1]];
      }
      const lines = ["Simulated interface data; no real network access."];
      for (const name of names) {
        const intf = session.interfaces[name];
        lines.push(`${name === "lo" ? "1" : "2"}: ${name}: <${name === "lo" ? "LOOPBACK" : "BROADCAST,MULTICAST"}${intf.up ? ",UP,LOWER_UP" : ""}> mtu ${name === "lo" ? "65536" : "1500"} state ${intf.up ? "UP" : "DOWN"}`);
        if (family !== "link") lines.push(`    inet ${intf.address} scope ${name === "lo" ? "host" : "global"} ${name}`);
      }
      return result(lines);
    }
    case "ping": {
      let repetitions = 3;
      const operands: string[] = [];
      for (let index = 0; index < args.length; index++) {
        if (args[index] === "-c") {
          const value = args[++index]; if (!/^[1-5]$/.test(value ?? "")) fail("ping: -c must be 1..5 in this model", 2); repetitions = Number(value);
        } else if (args[index].startsWith("-")) fail(`ping: unsupported option '${args[index]}'`, 2);
        else operands.push(args[index]);
      }
      count(operands, 1, 1, "ping [-c 1..5] HOST");
      const hosts: Record<string, string> = { localhost: "127.0.0.1", "training-rhel": "192.0.2.10", gateway: "192.0.2.1", "127.0.0.1": "127.0.0.1", "192.0.2.10": "192.0.2.10", "192.0.2.1": "192.0.2.1" };
      if (!Object.hasOwn(hosts, operands[0])) fail(`ping: ${operands[0]}: host outside the simulated lab; no real DNS or network request was made`, 2);
      const address = hosts[operands[0]], intf = address === "127.0.0.1" ? "lo" : "enp1s0";
      if (!session.interfaces[intf].up) fail("ping: Network is unreachable (simulated)");
      return result([`PING ${operands[0]} (${address}) — simulated replies`, ...Array.from({ length: repetitions }, (_, index) => `64 bytes from ${address}: icmp_seq=${index + 1} ttl=64 time=0.1 ms (simulated)`), `${repetitions} packets transmitted, ${repetitions} received, 0% packet loss (simulated)`]);
    }
    default: fail(`${command}: command not found in this educational model; type help`, 127);
  }
}

/** Atomic command execution: an error returns the original input, untouched. */
export function runLinuxCommand(session: LinuxSession, line: string): LinuxCommandResult {
  try {
    const tokens = tokenize(line);
    if (!tokens.length) return { session, output: [], exitCode: 0 };
    if (tokens.some((token) => token.operator && ![">", ">>"].includes(token.value))) fail("shell: pipes, chaining, background commands and input redirection are not supported", 2);
    const redirects = tokens.map((token, index) => token.operator ? index : -1).filter((index) => index >= 0);
    if (redirects.length > 1) fail("shell: only one output redirection is supported", 2);
    const redirect = redirects[0];
    if (redirect !== undefined && (redirect < 1 || redirect !== tokens.length - 2 || tokens[redirect + 1].operator)) fail("shell: use COMMAND > FILE or COMMAND >> FILE", 2);
    const words = (redirect === undefined ? tokens : tokens.slice(0, redirect)).map((token) => {
      if (!token.quoted && (token.value === "~" || token.value.startsWith("~/"))) return `${HOME}${token.value.slice(1)}`;
      if (!token.quoted && token.value.startsWith("~")) fail("shell: only the learner's ~ home shortcut is supported", 2);
      return token.value;
    });
    let user: LinuxUser = "learner", command = words.shift()!;
    if (command === "sudo") {
      if (!words.length || words[0].startsWith("-")) fail("usage: sudo COMMAND (only one-command educational elevation is supported)", 2);
      user = "root"; command = words.shift()!;
      if (command === "sudo") fail("sudo: nested elevation is not supported", 2);
    }
    if (!Object.hasOwn(LINUX_HELP, command)) fail(`${command}: command not found in this educational model; type help`, 127);
    const redirectPath = redirect === undefined ? undefined : pathOf(session, tokens[redirect + 1].value, "learner", !tokens[redirect + 1].quoted);
    const next: LinuxSession = JSON.parse(JSON.stringify(session));
    const answer = execute(next, command, words, user), exitCode = answer.exitCode ?? 0;
    if (exitCode !== 0) return { session, output: contentLines(answer.text), exitCode };
    if (redirect !== undefined) {
      writeFile(next, redirectPath!, answer.text, "learner", tokens[redirect].value === ">>");
    }
    if (Object.keys(next.files).length > MAX_FILES || Object.values(next.files).reduce((total, file) => total + file.content.length, 0) > MAX_TOTAL_CONTENT) fail("shell: virtual filesystem educational capacity exceeded");
    next.commandCount = Math.min(1_000_000, next.commandCount + 1);
    return { session: next, output: redirect === undefined ? contentLines(answer.text) : [], exitCode: 0 };
  } catch (error) {
    if (error instanceof CommandError) return { session, output: [error.message], exitCode: error.exitCode };
    return { session, output: ["shell: invalid virtual state; reset the educational session"], exitCode: 1 };
  }
}
