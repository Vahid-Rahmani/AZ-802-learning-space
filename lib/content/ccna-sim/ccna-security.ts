import { met, reachesDevice, unmet, type LabModel, type SimLabPack, type SimLabStep } from "../../ccna-sim/lab.ts";
import type { SimulationLink, SimulationNode, SimulationPort } from "../../ccna-sim/topology.ts";
import { ccnaLabPath } from "../ccna-lab-path.ts";

/**
 * The authored pack for `ccna-security`, the SSH and ordered-access-list stage.
 *
 * Devices, ports and addresses are the ones this lab publishes in `lib/content/ccna.ts`: the outline
 * names `PC-A → R1 G0/0` (192.168.60.10/24 · gateway .60.1), `R1` (G0/0 .60.1/24 · G0/1 .70.1/24)
 * and `R1 G0/1 → server` (192.168.70.20/24 · gateway .70.1). Those three devices and two cables are
 * what this pack implements; the outline's note places a switch on each LAN, and this practice model
 * collapses each single-VLAN access switch into the direct link the outline draws, as its diagram
 * note says.
 *
 * Two requirement families are graded from state and nothing else. The addressing and reachability
 * steps read interface addresses, administrative state, the published cables and a ping the network
 * model computes. The SSH steps read the management state the device really carries: the domain name,
 * the simulated RSA key size, the local users, and the VTY lines' `login local` and `transport input`
 * settings — which is exactly the state this engine's `ssh -l` login is gated on, so the console and
 * the grader cannot disagree about whether management access is encrypted.
 *
 * The access list is deliberately *not* graded. This engine implements no ACL, no `access-group` and
 * no packet filter, so a denial cannot be evaluated: every flow through it succeeds. The ACL steps
 * therefore carry `ungraded` with that limitation stated, and the baseline reachability step is
 * titled as the pre-filter baseline it is. A pack that ticked "PC-A cannot ping the server" here
 * would be inventing a result the engine never produced.
 */

function publishedLab() {
  const entry = ccnaLabPath.find((candidate) => candidate.id === "ccna-security");
  if (!entry) throw new Error("ccna-security is not a published lab, so its simulator pack cannot exist.");
  return entry;
}

const ethernetPort = (id: string, label: string): SimulationPort => ({ id, label, kind: "ethernet" });

/** The three devices the published outline names: PC-A, R1 and the server behind R1's second LAN. */
const devices: SimulationNode[] = [
  { id: "pc-a", label: "PC-A", kind: "pc", role: "host", x: 130, y: 150, subtitle: "192.168.60.10/24 · gateway .60.1", ports: [ethernetPort("gi0-0", "Gi0/0")] },
  { id: "r1", label: "R1", kind: "router", role: "router", x: 380, y: 300, subtitle: "2911 · G0/0 .60.1/24 · G0/1 .70.1/24", ports: [ethernetPort("gi0-0", "Gi0/0"), ethernetPort("gi0-1", "Gi0/1")] },
  { id: "server", label: "Server", kind: "server", role: "host", x: 630, y: 150, subtitle: "192.168.70.20/24 · gateway .70.1", ports: [ethernetPort("gi0-0", "Gi0/0")] },
];

/** The outline's two cables: PC-A → R1 G0/0 and R1 G0/1 → server. */
const links: SimulationLink[] = [
  { id: "ccna-security-link-1", source: { deviceId: "pc-a", portId: "gi0-0" }, target: { deviceId: "r1", portId: "gi0-0" }, status: "up", label: "PC-A → R1 G0/0" },
  { id: "ccna-security-link-2", source: { deviceId: "r1", portId: "gi0-1" }, target: { deviceId: "server", portId: "gi0-0" }, status: "up", label: "R1 G0/1 → server" },
];

const plan = [
  { id: "pc-a", label: "PC-A", ip: "192.168.60.10", port: "Gi0/0", gateway: "192.168.60.1", peer: "r1", peerPort: "Gi0/0" },
  { id: "server", label: "Server", ip: "192.168.70.20", port: "Gi0/0", gateway: "192.168.70.1", peer: "r1", peerPort: "Gi0/1" },
];

const routerPorts = [
  { port: "Gi0/0", ip: "192.168.60.1", mask: "255.255.255.0", network: "192.168.60.0/24 client LAN" },
  { port: "Gi0/1", ip: "192.168.70.1", mask: "255.255.255.0", network: "192.168.70.0/24 server LAN" },
];

const RSA_BITS = 2048;
const VTY_LINES = 5;

function routerInterfaceCheck(lab: LabModel): ReturnType<typeof met> {
  const router = lab.device("R1");
  if (!router.exists) return unmet("R1 is not part of this lab.");
  for (const expected of routerPorts) {
    const port = router.port(expected.port);
    if (!port.exists) return unmet(`R1 has no ${expected.port} in this lab's topology.`);
    if (!port.adminUp) return unmet(`R1 ${expected.port} is administratively down, so the ${expected.network} is unreachable.`);
    if (!port.address) return unmet(`R1 ${expected.port} has no IPv4 address yet. The lab publishes ${expected.ip} ${expected.mask}.`);
    if (port.address.ip !== expected.ip || port.address.mask !== expected.mask) {
      return unmet(`R1 ${expected.port} is ${port.address.ip} ${port.address.mask}; this lab publishes ${expected.ip} ${expected.mask}.`);
    }
  }
  return met("R1 G0/0 is 192.168.60.1/24 and G0/1 is 192.168.70.1/24, both up.");
}

function endHostCheck(lab: LabModel, host: typeof plan[number]): ReturnType<typeof met> {
  const device = lab.device(host.id);
  if (!device.exists) return unmet(`${host.label} is not part of this lab.`);
  const nic = device.port(host.port);
  if (!nic.exists) return unmet(`${host.label} has no ${host.port} in this lab's topology.`);
  if (!nic.adminUp) return unmet(`${host.label} ${host.port} is administratively down.`);
  if (!lab.linked(`${host.id}:${host.port}`, `${host.peer}:${host.peerPort}`)) {
    return unmet(`${host.label} ${host.port} is not cabled to ${lab.device(host.peer).label} ${host.peerPort}.`);
  }
  if (!nic.address) return unmet(`${host.label} has no IPv4 address on ${host.port} yet.`);
  if (nic.address.ip !== host.ip || nic.address.mask !== "255.255.255.0") {
    return unmet(`${host.label} is ${nic.address.ip} ${nic.address.mask}; this lab publishes ${host.ip} 255.255.255.0.`);
  }
  if (device.gateway !== host.gateway) {
    return unmet(`${host.label}'s default gateway is ${device.gateway ?? "not set"}; it must be ${host.gateway}, the R1 interface on its own LAN.`);
  }
  return met(`${host.label} is ${host.ip} 255.255.255.0 with gateway ${host.gateway} on its published cable.`);
}

/**
 * The state a simulated SSH login is gated on, split into the two requirements a real device needs:
 * the identity and key material, and the VTY policy that restricts management transport. Each reads
 * `LabDeviceView.management`, so removing the domain name, shrinking the key or putting Telnet back on
 * the VTY lines changes what this reports.
 */
function sshIdentityCheck(lab: LabModel): ReturnType<typeof met> {
  const router = lab.device("R1");
  if (!router.exists) return unmet("R1 is not part of this lab.");
  const management = router.management;
  if (!management.domain) return unmet("R1 has no domain name yet. Configure ip domain-name before generating an RSA key; the device refuses the key command without it.");
  if (management.rsaBits < RSA_BITS) {
    return unmet(management.rsaBits ? `R1's simulated RSA key is ${management.rsaBits} bits; this lab asks for ${RSA_BITS}.` : `R1 has no RSA key configuration yet, so it has no SSH server to log in to. Configure crypto key generate rsa modulus ${RSA_BITS}.`);
  }
  const localUsers = Object.entries(management.users);
  if (!localUsers.length) return unmet("R1 has no local user yet. Configure username <name> secret <lab-only-password>, or login local has nothing to check.");
  const secrets = localUsers.filter(([, user]) => user.kind === "secret");
  if (!secrets.length) return unmet(`R1 stores ${localUsers.map(([name]) => name).join(", ")} with a plaintext line password; this lab asks for a secret.`);
  return met(`R1 has domain ${management.domain}, a ${management.rsaBits}-bit simulated key and local user ${secrets[0][0]} configured with a secret.`);
}

function sshVtyCheck(lab: LabModel): ReturnType<typeof met> {
  const router = lab.device("R1");
  if (!router.exists) return unmet("R1 is not part of this lab.");
  const vty = router.management.vty.slice(0, VTY_LINES);
  if (vty.length < VTY_LINES) return unmet(`R1 publishes ${vty.length} VTY lines; this lab configures line vty 0 ${VTY_LINES - 1}.`);
  const noLocal = vty.filter((line) => !line.loginLocal).length;
  if (noLocal) return unmet(`${noLocal} of R1's VTY lines 0-${VTY_LINES - 1} do not use login local, so a local user is not what authenticates them.`);
  const wrongTransport = vty.filter((line) => !(line.transport.length === 1 && line.transport[0] === "ssh"));
  if (wrongTransport.length) {
    const current = wrongTransport[0].transport.join(" ") || "none";
    return unmet(`${wrongTransport.length} of R1's VTY lines 0-${VTY_LINES - 1} still accept "${current}". This lab keeps SSH only, so transport input ssh on every one of them.`);
  }
  return met(`R1's VTY lines 0-${VTY_LINES - 1} all use login local and accept SSH only.`);
}

function saveCheck(lab: LabModel): ReturnType<typeof met> {
  const router = lab.device("R1");
  if (!router.startupSaved) return unmet("R1 has no saved startup configuration yet, so its management configuration would not survive a reload.");
  if (!router.startupMatchesRunning) return unmet("R1 has unsaved changes: its startup configuration differs from its running configuration.");
  return met("R1 saved a startup configuration that matches its running configuration.");
}

const steps: SimLabStep[] = [
  {
    id: "r1-interfaces", title: "Address both R1 LANs", deviceId: "r1",
    instruction: "On R1 configure interface gi0/0 with ip address 192.168.60.1 255.255.255.0 and interface gi0/1 with ip address 192.168.70.1 255.255.255.0, then enable both ports.",
    why: "Filtering is meaningless until both LANs exist. A router port starts administratively down, so a rule cannot repair an interface that was never enabled.",
    commands: ["interface gi0/0", "ip address 192.168.60.1 255.255.255.0", "no shutdown", "exit", "interface gi0/1", "ip address 192.168.70.1 255.255.255.0", "no shutdown"],
    check: routerInterfaceCheck,
  },
  {
    id: "pc-a", title: "Address and cable PC-A", deviceId: "pc-a",
    instruction: "On the PC-A console set 192.168.60.10 255.255.255.0 and the default gateway 192.168.60.1. In Packet Tracer this is the Desktop → IP Configuration window.",
    why: "The client must reach R1 before any flow can be tested, and the baseline has to exist before a filter is placed in front of it.",
    commands: ["ip address 192.168.60.10 255.255.255.0", "ip default-gateway 192.168.60.1"],
    check: (lab) => endHostCheck(lab, plan[0]),
  },
  {
    id: "server", title: "Address and cable the server", deviceId: "server",
    instruction: "On the server console set 192.168.70.20 255.255.255.0 and its gateway 192.168.70.1, the R1 interface on its own LAN.",
    why: "The server needs a return path through R1, or a permitted request still fails a reply and looks like a filter problem.",
    commands: ["ip address 192.168.70.20 255.255.255.0", "ip default-gateway 192.168.70.1"],
    check: (lab) => endHostCheck(lab, plan[1]),
  },
  {
    id: "ssh-identity", title: "Prepare R1's identity and RSA key", deviceId: "r1",
    instruction: "On R1 configure hostname R1, ip domain-name ccna.lab, username learner secret <your own lab-only password>, then crypto key generate rsa modulus 2048.",
    why: "An SSH server needs a hostname, a domain name and key material before it can start; the device refuses the key command while the domain name is missing, and this model enforces the same order.",
    commands: ["hostname R1", "ip domain-name ccna.lab", "username learner secret LabOnlyChangeMe2026", "crypto key generate rsa modulus 2048"],
    check: sshIdentityCheck,
  },
  {
    id: "ssh-vty", title: "Restrict the VTY lines to SSH with local login", deviceId: "r1",
    instruction: "On R1 configure line vty 0 4, then login local and transport input ssh on all five lines. That is what makes the console unavailable over clear text.",
    why: "The check reads each of the five VTY lines, so leaving one of them on Telnet, or omitting login local, is reported with the line state instead of being accepted.",
    commands: ["line vty 0 4", "login local", "transport input ssh"],
    check: sshVtyCheck,
  },
  {
    id: "ping-server", title: "Prove the baseline path to the server", deviceId: "pc-a",
    instruction: "From PC-A run ping 192.168.70.20. This is the lab's pre-filter baseline: client to server across R1, before any access list is applied.",
    why: "This step grades reachability only. It is the control flow the lab establishes first, and it is what makes a later denial meaningful on a real device.",
    commands: ["ping 192.168.70.20"],
    check: (lab) => reachesDevice(lab, "pc-a", "server", "192.168.70.20"),
  },
  {
    id: "save-r1", title: "Save R1's configuration", deviceId: "r1",
    instruction: "On R1 enter end, then copy running-config startup-config, so the management hardening survives a reload.",
    why: "The check compares the saved copy with the running configuration, so an outdated saved file is reported as unsaved work rather than counted.",
    commands: ["end", "copy running-config startup-config"],
    check: saveCheck,
  },
  {
    id: "acl-deny", title: "Apply the intentional echo denial", deviceId: "r1",
    instruction: "On R1 in global configuration create ip access-list extended LAB-FILTER with deny icmp host 192.168.60.10 host 192.168.70.20 echo followed by permit ip any any, then apply it inbound on gi0/0 with ip access-group LAB-FILTER in. Keep the console open: an ACL is evaluated in order.",
    why: "The lab's own test is a negative one: PC-A's echo to the server must fail while HTTP and SSH still work. A specific denial has to precede the broad permit or the broad permit matches first.",
    commands: ["ip access-list extended LAB-FILTER", "deny icmp host 192.168.60.10 host 192.168.70.20 echo", "permit ip any any", "exit", "interface gi0/0", "ip access-group LAB-FILTER in"],
    ungraded: "Not evaluated here: this practice model implements no ACL engine, no access-group and no packet filter, so every flow through the link succeeds and it cannot produce the denial this step is about. It states the exercise instead of ticking it.",
  },
  {
    id: "acl-allow", title: "Confirm the permitted flows still work", deviceId: "pc-a",
    instruction: "From PC-A open the server's HTTP page and log in to R1 over SSH again after the list is applied. On a real device both must still succeed while the echo request is denied.",
    why: "A policy that breaks everything is not the intended policy, so the passing control flows are part of the lab's evidence.",
    ungraded: "Not evaluated here: without a packet filter this model cannot distinguish a permitted flow from a denied one, so it does not claim that either was tested. The reachability step above is the only flow it grades.",
  },
  {
    id: "packet-tracer", title: "Repeat the build in your own Packet Tracer file", deviceId: "r1",
    instruction: "Open ccna-06.pkt with the switches on both LANs, enable HTTP on Server-PT, and repeat the addressing, the SSH hardening and the ordered access list there.",
    why: "The browser console is this site's practice model. The access list and the HTTP service are the parts of the lab this model does not implement, and Packet Tracer is where they are practised.",
    ungraded: "Not evaluated here: this site cannot read your Packet Tracer file, and it will not pretend your .pkt was checked.",
  },
];

export function createCcnaSecurityPack(): SimLabPack {
  const lab = publishedLab();
  return {
    labId: "ccna-security",
    title: lab.title,
    difficulty: lab.tier,
    duration: lab.duration,
    scenario: {
      role: lab.scenario.role,
      context: lab.scenario.context,
      objective: lab.scenario.requirement,
      requirement: "R1 is the only device under management: PC-A (192.168.60.10/24) keeps a working path to the server (192.168.70.20/24) across R1's two LANs, and R1's management access is encrypted with local login, an RSA key of at least 2048 bits and SSH-only VTY lines. The ordered echo denial is part of the lab but is not evaluated by this practice model, which implements no access list.",
      prerequisites: lab.prerequisites,
    },
    diagramNote:
      "The published outline names PC-A → R1 G0/0, R1 (G0/0 .60.1/24 · G0/1 .70.1/24) and R1 G0/1 → server, with the client at 192.168.60.10/24 and the server at 192.168.70.20/24. Those three devices, those two cables and those addresses are what this pack implements. The outline's note places a switch on each LAN; a switch in a single VLAN forwards untagged frames transparently, so this practice model collapses each access switch into the direct link the outline draws. The SSH steps read the simulated management state this engine's own SSH login is gated on, and the access-list steps are stated as ungraded because this engine has no packet filter.",
    devices,
    links,
    objectives: [
      {
        id: "lan",
        title: "Build the two published LANs",
        detail: "Three live steps: R1's two addressed and enabled ports, and both endpoints' address, gateway and published cable. Each reads the state the learner produced.",
        steps: steps.filter((step) => ["r1-interfaces", "pc-a", "server"].includes(step.id)),
      },
      {
        id: "management",
        title: "Harden R1's management access",
        detail: "Two live steps reading the simulated management state the SSH login is gated on: the domain name, RSA key size and local secret user; and all five VTY lines using login local with SSH-only transport.",
        steps: steps.filter((step) => step.id.startsWith("ssh-")),
      },
      {
        id: "proof",
        title: "Prove the baseline path and save the work",
        detail: "A ping the model computes across both LANs and R1's saved startup configuration. The echo denial, the permitted-flow check and the Packet Tracer repeat are stated as ungraded: this engine implements no access list, so it does not tick them.",
        steps: steps.filter((step) => ["ping-server", "save-r1", "acl-deny", "acl-allow", "packet-tracer"].includes(step.id)),
      },
    ],
    references: lab.sourceRefs.map((source) => ({ title: source.title, url: source.url })),
    solution: [
      {
        deviceId: "r1",
        commands: [
          "enable", "configure terminal", "hostname R1",
          "interface gi0/0", "ip address 192.168.60.1 255.255.255.0", "no shutdown", "exit",
          "interface gi0/1", "ip address 192.168.70.1 255.255.255.0", "no shutdown", "exit",
          "ip domain-name ccna.lab",
          "username learner secret LabOnlyChangeMe2026",
          "crypto key generate rsa modulus 2048",
          "line vty 0 4", "login local", "transport input ssh",
          "end", "copy running-config startup-config",
        ],
      },
      { deviceId: "pc-a", commands: ["ip address 192.168.60.10 255.255.255.0", "ip default-gateway 192.168.60.1", "ipconfig"] },
      { deviceId: "server", commands: ["ip address 192.168.70.20 255.255.255.0", "ip default-gateway 192.168.70.1", "ipconfig"] },
    ],
  };
}
