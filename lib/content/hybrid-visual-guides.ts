import type { AdVisualBinding, AdVisualGuideData } from "./ad-visual-guide-types";

const source = "https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/use/get-started";
const media = "https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/media/launch/";
const screenshotLabel = "Microsoft Windows Admin Center reference · interface varies by release.";
const connections: AdVisualGuideData = {
  id: "hybrid-wac-connections", category: "Hybrid management", kind: "screenshot",
  title: "Windows Admin Center · connect to a managed server", source,
  versionNote: "Official Microsoft Windows Admin Center screenshots, not verified Server 2025 desktop captures. The displayed Azure Stack HCI name is from an older interface. Labels vary by release.",
  prerequisites: "Use an installed, trusted lab gateway and an authorized test server. Gateway access does not automatically grant access to managed servers. This walkthrough is not a deployment wizard.",
  steps: [
    { id: "connections", title: "Open the browser-based management console", path: ["Trusted Windows Admin Center URL", "All connections", "+ Add"], instruction: "Windows Admin Center manages server resources through a browser, rather than replacing Windows Server. Open the connection list.", image: `${media}use-get-started-4.png`, alt: "Windows Admin Center All connections toolbar with Add highlighted", screenshotLabel, source },
    { id: "resource", title: "Choose the managed resource type", path: ["Add or create resources", "Servers → Add", "Add one → Server name", "Add"], instruction: "For an existing lab server, select Servers and enter its name. Other cards support PCs, clusters and Azure VMs. Adding a connection does not deploy a server or prove connectivity.", image: `${media}use-get-started-5.png`, alt: "Windows Admin Center resource cards for servers, PCs, clusters and Azure VMs", screenshotLabel, source },
    { id: "credentials", title: "Authenticate to the selected server", path: ["All connections", "Select the lab server", "Manage as, if needed", "Connect"], instruction: "Use an authorized management identity. Enter credentials only in your trusted lab, not this website. Recheck permissions if connection fails; gateway membership and target permissions are separate.", image: `${media}use-get-started-9.png`, alt: "Windows Admin Center toolbar with Manage as highlighted", screenshotLabel, source },
  ],
};

// Exact reviewed identities, never inferred from keywords or answer options.
const bindings: Record<string, AdVisualBinding> = {
  "az802-q-066": { guide: connections, startStep: "resource", context: "See the browser console and the resources Windows Admin Center can manage." },
  "az802-q-323": { guide: connections, startStep: "connections", context: "Follow the browser interface used to connect to Windows Server management tools." },
};
export function getHybridVisualGuide(question: { id: string; domain: string }) {
  return question.domain === "Manage Windows Server instances and workloads in a hybrid environment" ? bindings[question.id] ?? null : null;
}
