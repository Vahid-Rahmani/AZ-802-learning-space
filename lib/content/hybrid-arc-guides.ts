import type { AdVisualBinding, AdVisualGuideData } from "./ad-visual-guide-types";

const portal = "https://learn.microsoft.com/en-us/azure/azure-arc/servers/onboard-portal";
const show = "https://learn.microsoft.com/en-us/azure/azure-arc/servers/azcmagent-show";
const troubleshoot = "https://learn.microsoft.com/en-us/azure/azure-arc/servers/troubleshoot-vm-extensions";
const check = "https://learn.microsoft.com/en-us/azure/azure-arc/servers/azcmagent-check";

const arc: AdVisualGuideData = {
  id: "hybrid-arc-agent-health", category: "Hybrid management", kind: "screenshot",
  title: "Azure Arc · inspect the server and Connected Machine agent", source: portal,
  versionNote: "Original Microsoft Azure portal and azcmagent reference screenshots. Capture OS/agent versions are unspecified; these are not verified Server 2025 desktop captures. Portal wording can change.",
  prerequisites: "An authorized lab Arc resource and its Windows server. These are reference instructions, not a live Azure connection. Do not enter credentials here, disable firewalls, disconnect the agent or reinstall extensions to answer the question.",
  steps: [
    {
      id: "inventory", title: "Find the existing server's Azure representation",
      path: ["Azure portal", "Azure Arc", "Infrastructure → Machines", "Select your lab server"],
      instruction: "Arc adds an Azure management resource for a server that still runs outside Azure. Match the machine's name and connection state before opening it; onboarding is not migration to an Azure VM.",
      image: "https://learn.microsoft.com/en-us/azure/azure-arc/servers/media/quick-enable-hybrid-vm/enabled-machine.png",
      alt: "Azure Arc Machines list with the arctest1 machine and its Connected agent status highlighted.",
      screenshotLabel: "Microsoft Azure portal reference · capture version unspecified",
      screenshotSource: portal, screenshotCredit: "Microsoft Learn · Azure Arc-enabled servers", source: portal,
      imageNote: "The source's arctest1 is a Connected example. Your server name and status may differ; this does not establish that your own server is online.",
    },
    {
      id: "agent", title: "Inspect the Connected Machine agent locally",
      path: ["Authorized Windows server", "PowerShell", "azcmagent show", "Agent Status and Dependent Service Status", "Recent agent logs"],
      command: "azcmagent show\nGet-Service himds",
      instruction: "The Connected Machine agent establishes Arc connectivity. Compare its local state and services with the portal. For an offline server or pending extension, check agent health and recent logs first, including %ProgramData%\\AzureConnectedMachineAgent\\log and extension logs in C:\\ProgramData\\GuestConfig\\ext_mgr_logs.",
      image: "https://learn.microsoft.com/en-us/azure/azure-arc/servers/media/troubleshoot-vm-extensions/dependent-services-status.png",
      alt: "Actual azcmagent status output: Connected agent, running himds, extensionservice and gcarcservice; arcproxy is stopped.",
      screenshotLabel: "Microsoft azcmagent reference · capture OS/version unspecified",
      screenshotSource: troubleshoot, screenshotCredit: "Microsoft Learn · Arc extension troubleshooting", source: show,
      imageNote: "This successful sample is not an offline-server result. Microsoft says the stopped Azure Arc Proxy in this example can be ignored; do not mistake it for a stopped HIMDS or Extension Service. Commands above read status, not configure the server.",
    },
    {
      id: "connectivity", title: "Check endpoints and extension-specific evidence",
      path: ["Affected server → azcmagent check", "Review failed endpoint tests", "Azure Arc → machine → Settings → Extensions", "Relevant extension logs"],
      command: "azcmagent check",
      instruction: "Use endpoint test results to investigate proxy, DNS or outbound access problems. Then inspect the affected extension's state and logs. Connected does not guarantee an extension succeeded; preserve evidence before planning a repair. This diagram is explanatory, not captured command output.",
      source: check,
      alt: "Read-only troubleshooting sequence from agent health through endpoint reachability to extension-specific evidence.",
      diagram: {
        title: "Explanatory diagram · Arc diagnosis",
        nodes: [{ id: "agent", label: "Agent health", detail: "Local state and dependent services" }, { id: "network", label: "Endpoint checks", detail: "Proxy / DNS / permitted outbound connectivity" }, { id: "extension", label: "Extension evidence", detail: "Portal state plus its own logs" }],
        edges: [{ from: "agent", to: "network", label: "next check" }, { from: "network", to: "extension", label: "correlate" }],
      },
    },
  ],
};

export const hybridArcBindings: Record<string, AdVisualBinding> = {
  "az802-q-069": { guide: arc, startStep: "inventory", context: "Locate the Azure management representation of a server that remains on-premises or in another cloud." },
  "az802-q-070": { guide: arc, startStep: "agent", context: "Identify the Azure Connected Machine agent through its local status command and dependent services." },
  "az802-q-071": { guide: arc, startStep: "agent", context: "A pending extension needs agent and outbound-connectivity checks; a Connected portal entry alone is insufficient." },
  "az802-q-095": { guide: arc, startStep: "agent", context: "Start on the affected server: inspect HIMDS, azcmagent state and recent logs before changing anything." },
};
