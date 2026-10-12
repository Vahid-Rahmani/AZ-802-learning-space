import type { LinuxSession } from "../linux-sim/engine";

type LinuxStep = { id: string; title: string; hint: string; check: (session: LinuxSession) => boolean };
export type LinuxLesson = { id: string; title: string; summary: string; why: string; steps: LinuxStep[] };
const base = "/home/learner/practice";
const file = (s: LinuxSession, name: string) => s.files[`${base}/${name}`];
export const linuxLessons: LinuxLesson[] = [
  { id: "001", title: "Your first workspace", summary: "Create a practice directory, enter it and make an empty notes file.", why: "Your shell has a working directory. Relative paths start there; an absolute path starts at /. Keep your experiments in your home directory.", steps: [
    { id: "directory", title: "Create ~/practice", hint: "mkdir -p ~/practice", check: s => s.files[base]?.kind === "directory" },
    { id: "location", title: "Make it your working directory", hint: "cd ~/practice", check: s => s.cwd === base },
    { id: "notes", title: "Create notes.txt in that directory", hint: "touch ~/practice/notes.txt", check: s => file(s, "notes.txt")?.kind === "file" },
  ] },
  { id: "002", title: "Write and inspect a file", summary: "Put Linux practice in your notes file, then inspect it with cat.", why: "> replaces a file's contents; >> appends. cat reads the contents. Reading a file never changes its configuration or completes an unrelated goal.", steps: [
    { id: "content", title: "notes.txt contains Linux practice", hint: 'echo "Linux practice" > ~/practice/notes.txt', check: s => file(s, "notes.txt")?.content.trim() === "Linux practice" },
  ] },
  { id: "003", title: "Protect your notes", summary: "Give the owner read/write access, the group read access and everyone else no access.", why: "Permissions are owner / group / other. In numeric modes, read = 4, write = 2 and execute = 1. Mode 640 therefore means rw- / r-- / ---.", steps: [
    { id: "permissions", title: "Set notes.txt permissions to 640", hint: "chmod 640 ~/practice/notes.txt", check: s => file(s, "notes.txt")?.kind === "file" && file(s, "notes.txt")?.mode === 0o640 },
  ] },
  { id: "004", title: "Install a service package", summary: "Install the Apache HTTP Server package using the simulated DNF package manager.", why: "DNF manages packages. Installing httpd makes its service available; it does not mean that the service is running. sudo here models elevated permission, not real authentication.", steps: [
    { id: "package", title: "Install httpd", hint: "sudo dnf install httpd", check: s => s.packages.httpd === true },
  ] },
  { id: "005", title: "Run and enable a service", summary: "Start httpd now and enable it for the simulated boot configuration.", why: "Active is the current runtime state; enabled is the startup setting. systemctl start and systemctl enable are different operations. Stopping the service removes the active check.", steps: [
    { id: "running", title: "httpd is active", hint: "sudo systemctl start httpd", check: s => s.packages.httpd === true && s.services.httpd?.running === true },
    { id: "enabled", title: "httpd is enabled at startup", hint: "sudo systemctl enable httpd", check: s => s.packages.httpd === true && s.services.httpd?.enabled === true },
  ] },
  { id: "006", title: "Make a protected backup", summary: "Create a practice config file and a private backup before making further changes.", why: "A backup should preserve the contents you intend to recover. This is a practice file, not a deployed Apache configuration; it does not change a real server.", steps: [
    { id: "config", title: "Create config/httpd.conf with ServerName training-rhel", hint: 'mkdir -p ~/practice/config\necho "ServerName training-rhel" > ~/practice/config/httpd.conf', check: s => file(s, "config/httpd.conf")?.content.trim() === "ServerName training-rhel" },
    { id: "backup", title: "Make an identical httpd.conf.bak", hint: "cp ~/practice/config/httpd.conf ~/practice/config/httpd.conf.bak", check: s => file(s, "config/httpd.conf")?.kind === "file" && file(s, "config/httpd.conf.bak")?.kind === "file" && file(s, "config/httpd.conf.bak")?.content === file(s, "config/httpd.conf")?.content },
    { id: "private", title: "Give only the owner access to the backup (600)", hint: "chmod 600 ~/practice/config/httpd.conf.bak", check: s => file(s, "config/httpd.conf.bak")?.mode === 0o600 },
  ] },
];

export function linuxLessonResults(session: LinuxSession, id: string) {
  return (linuxLessons.find(lesson => lesson.id === id)?.steps ?? []).map(step => ({ id: step.id, title: step.title, hint: step.hint, passed: step.check(session) }));
}

export const linuxSources = [
  { title: "Red Hat · Managing software with DNF", url: "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_software_with_the_dnf_tool/index" },
  { title: "Red Hat · systemd unit files", url: "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/using_systemd_unit_files_to_customize_and_optimize_your_system/index" },
  { title: "GNU · Files, text and permissions", url: "https://www.gnu.org/software/coreutils/manual/coreutils.html" },
  { title: "GNU Bash · Shell commands", url: "https://www.gnu.org/software/bash/manual/bash.html" },
];
