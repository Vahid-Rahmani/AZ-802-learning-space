import type { AdVisualBinding, AdVisualDiagram, AdVisualGuideData } from "./ad-visual-guide-types";

const wacInstall = "https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/deploy/install?tabs=desktop-experience";
const wacOptions = "https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/plan/installation-options";
const wacStart = "https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/use/get-started";
const wacAzure = "https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/azure/azure-integration";
const wacServices = "https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/azure/";
const rdsRoles = "https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/rds-roles";
const rdsCollections = "https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/rds-create-collection";
const rdsMfa = "https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-nps-extension-rdg";
const wacMedia = "https://learn.microsoft.com/en-us/windows-server/manage/windows-admin-center/media/";
const rdsMedia = "https://learn.microsoft.com/en-us/entra/identity/authentication/media/howto-mfa-nps-extension-rdg/";
const screenshotCredit = "Microsoft Learn · original documentation screenshot";
const wacLabel = "Microsoft Windows Admin Center v2 installer · host OS version unspecified";
const rdsLabel = "Microsoft original screenshot · Windows Server 2016 reference";
const explanatoryOnly = "Explanatory walkthrough only; no installation, connection or cloud operation has been performed. Use approved lab resources and appropriate delegated access. Review deployment, certificates, licensing, permissions and network changes before applying them.";
function diagram(title: string, nodes: AdVisualDiagram["nodes"], edges: AdVisualDiagram["edges"]): AdVisualDiagram {
  return { title: `Authored explanatory diagram · ${title}`, nodes, edges };
}

const wacGateway: AdVisualGuideData = {
  id: "hybrid-wac-gateway-deployment", category: "Hybrid management",
  title: "Windows Admin Center · shared gateway and HTTPS",
  source: wacOptions, kind: "screenshot",
  versionNote: "The original Microsoft WAC v2 installer screenshots were visually reviewed; their host OS version is unspecified. Current documentation distinguishes server remote access on 443 from local Windows client access on 6600. Custom ports and earlier releases can differ. The topology is an authored explanation, not a screenshot.",
  prerequisites: explanatoryOnly,
  steps: [
    {
      id: "gateway", title: "Identify the on-premises gateway deployment",
      path: ["Deployment planning", "Windows Admin Center installation options", "Gateway server"],
      instruction: "For shared browser-based management, install the gateway on an organization's supported server. Administrators browse to that gateway; it manages the permitted target machines. This differs from a local client installation for one administrator. The planning path is documentation, not an installer screen.",
      diagram: diagram("Shared on-premises gateway", [{ id: "browser", label: "Administrator browser" }, { id: "gateway", label: "Organization's WAC gateway server" }, { id: "targets", label: "Authorized managed servers" }], [{ from: "browser", to: "gateway", label: "HTTPS" }, { from: "gateway", to: "targets", label: "Management protocols" }]),
      source: wacOptions,
      alt: "Authored topology showing administrator browser access to a shared on-premises WAC gateway, which manages authorized servers.",
      imageNote: "Authored explanatory diagram; no installation or successful connection is depicted.",
    },
    {
      id: "https", title: "Check the mode before assuming the HTTPS port",
      path: ["Windows Admin Center v2 installer", "Windows Admin Center Setup", "Express setup / Custom setup"],
      instruction: "In the current v2 installer, Express uses remote access on external port 443 on a server OS, but local access on 6600 on Windows client. Custom setup permits a different port. Use the configured gateway URL; 443 is the usual server-gateway answer, not a universal default for every installation.",
      image: `${wacMedia}windows-admin-center-v2-installation-mode.png`,
      source: wacStart, screenshotSource: wacInstall, screenshotCredit, screenshotLabel: wacLabel,
      alt: "WAC v2 setup mode page: Express lists server remote access on 443 and Windows client local access on 6600; Custom allows configuration.",
      imageNote: "The source capture selects Express; it does not establish this environment's installed mode or port.",
    },
    {
      id: "certificate", title: "Review the HTTPS certificate choice",
      path: ["Windows Admin Center v2 installer", "Custom setup", "Select TLS certificate"],
      instruction: "Review a trusted certificate matching the gateway's DNS name. The installer can use a pre-installed certificate in LocalMachine\\My. The source's selected self-signed option expires after 60 days and is for testing; use an appropriately trusted certificate for production access.",
      image: `${wacMedia}select-tls-certificate.png`,
      source: wacInstall, screenshotSource: wacInstall, screenshotCredit, screenshotLabel: wacLabel,
      alt: "Select TLS certificate page offering a pre-installed certificate or a self-signed certificate that expires in 60 days.",
      imageNote: "The pictured self-signed selection is the documentation's example, not a production recommendation or evidence that a trusted certificate is installed.",
    },
  ],
};

const wacHybrid: AdVisualGuideData = {
  id: "hybrid-wac-azure-integration", category: "Hybrid management",
  title: "Windows Admin Center · Azure integration",
  source: wacAzure, kind: "screenshot",
  versionNote: "The service-hub image is an original older Windows Admin Center Preview capture, with host OS unspecified. It uses Azure hybrid center and historical service tiles; it is not a current service catalog or a Windows Server 2025 screenshot. Registration is shown with a clearly labeled authored diagram.",
  prerequisites: explanatoryOnly,
  steps: [
    {
      id: "registration", title: "Locate gateway registration with Azure",
      path: ["Windows Admin Center", "Settings", "Azure"],
      instruction: "A gateway administrator registers WAC with Azure through the Azure settings. Registration associates an application in Microsoft Entra ID with the gateway; individual hybrid services still need their own prerequisites, permissions and setup. This enables integration rather than automatically onboarding every managed server.",
      diagram: diagram("Gateway registration is not service deployment", [{ id: "gateway", label: "WAC gateway · Settings → Azure" }, { id: "app", label: "Microsoft Entra application registration" }, { id: "services", label: "Service-specific Azure workflows" }], [{ from: "gateway", to: "app", label: "Register gateway" }, { from: "app", to: "services", label: "Separate setup and permissions" }]),
      source: wacAzure,
      alt: "Authored diagram distinguishing gateway registration in Microsoft Entra ID from the separate setup of Azure hybrid services.",
      imageNote: "Authored explanatory diagram, not a Settings screenshot. No tenant registration or consent has been performed.",
    },
    {
      id: "hybrid-services", title: "Recognize the Azure hybrid service entry points",
      path: ["Windows Admin Center", "Connect to your server", "Tools", "Azure hybrid services (older capture: Azure hybrid center)"],
      instruction: "The hybrid services tool brings local server management together with Azure service workflows. Identify the relevant entry point, then consult its current documentation before setup. WAC is not a replacement for Azure administration or an automatic connection of all resources.",
      image: `${wacMedia}azure-services/azure-hybrid-services.png`,
      source: wacServices, screenshotSource: wacServices, screenshotCredit,
      screenshotLabel: "Older Microsoft WAC Preview interface · host OS version unspecified",
      alt: "Older WAC Preview Azure hybrid center showing Set up Azure Arc and example Azure service tiles for a connected server.",
      imageNote: "The selected tool in the original image is Azure hybrid center. Historical tiles and names are reference context, not confirmation of current availability, enabled services or completed onboarding.",
    },
  ],
};

const rdsAccess: AdVisualGuideData = {
  id: "hybrid-rds-sessions-gateway", category: "Hybrid management",
  title: "Remote Desktop Services · sessions and protected access",
  source: rdsRoles, kind: "screenshot",
  versionNote: "Both original Microsoft RD Web and RD CAP Store screenshots come from a tutorial performed on Windows Server 2016. They are historical control references, not Windows Server 2025 captures or evidence of a deployed environment. Current RDS role documentation covers newer versions; topology images here are authored explanations.",
  prerequisites: `${explanatoryOnly} A real RDS deployment requires its role configuration and applicable RDS licensing. The MFA design additionally needs a supported separate NPS server, the NPS extension, eligible users and completed MFA prerequisites.`,
  steps: [
    {
      id: "session-host", title: "Locate the collection and its session hosts",
      path: ["Server Manager", "Remote Desktop Services", "Collections", "Your collection"],
      instruction: "In an existing RDS deployment, review the collection's RD Session Hosts and authorized users. RD Session Host provides user desktops or RemoteApp sessions; RD Connection Broker directs and reconnects farm sessions. Enabling ordinary administrative Remote Desktop on a server does not create an RDS collection or its multi-user service.",
      diagram: diagram("RDS collection versus administrative RDP", [{ id: "user", label: "User requests published resource" }, { id: "broker", label: "RD Connection Broker" }, { id: "collection", label: "Collection · RD Session Hosts", detail: "User desktops / RemoteApp sessions" }], [{ from: "user", to: "broker", label: "Connection request" }, { from: "broker", to: "collection", label: "Direct / reconnect session" }]),
      source: rdsCollections,
      alt: "Authored RDS diagram showing the Connection Broker directing a user to a session host in a collection, distinct from administrative RDP.",
      imageNote: "Authored role overview, not a Server Manager screenshot. Broker routing does not mean all session traffic passes through the broker.",
    },
    {
      id: "published-desktop", title: "Identify a published desktop in RD Web Access",
      path: ["Your trusted RD Web Access URL", "RemoteApp and Desktops", "Your published desktop collection"],
      instruction: "RD Web Access advertises resources published by the RDS deployment. The source's Desktop Collection launches the native Remote Desktop client and an authentication prompt; it is not a completed desktop session or proof of browser-only RDP. A session host provides the desktop after authorized connection.",
      image: `${rdsMedia}image25.png`,
      source: rdsRoles, screenshotSource: rdsMfa, screenshotCredit, screenshotLabel: rdsLabel,
      alt: "Windows Server 2016 RD Web Access Work Resources page with Desktop Collection and a native Windows Security authentication prompt.",
      imageNote: "Desktop Collection and broker.contoso.com are source examples. The masked credential prompt is illustrative; no credentials are requested or supplied here.",
    },
    {
      id: "gateway", title: "Separate protected access from exposed host RDP",
      path: ["Server Manager", "Tools → Remote Desktop Services", "Remote Desktop Gateway Manager", "Your gateway", "Policies → Connection Authorization Policies / Resource Authorization Policies"],
      instruction: "Publish remote access through a trusted RD Gateway, not each Session Host's public 3389 port. CAP controls eligible users; RAP controls reachable resources. Restrict connecting source addresses in perimeter network filters, not by confusing them with RAP targets. Gateway client access normally uses TLS TCP 443; optional UDP 3391 depends on the design.",
      diagram: diagram("Protect the RDS entry point", [{ id: "client", label: "Allowed external clients" }, { id: "filter", label: "Perimeter source filters" }, { id: "gateway", label: "RD Gateway", detail: "Trusted TLS · CAP users / RAP resources" }, { id: "host", label: "Private RD Session Hosts" }], [{ from: "client", to: "filter" }, { from: "filter", to: "gateway", label: "TCP 443 · optional UDP 3391" }, { from: "gateway", to: "host", label: "Private RDP · commonly TCP 3389" }]),
      source: rdsRoles,
      alt: "Authored diagram routing allowed external clients through source-address filters and RD Gateway to private session hosts, with CAP and RAP separately labeled.",
      imageNote: "Authored explanatory topology, not a firewall rule set. Use the actual topology and current documentation when reviewing required protocols and trusted certificates.",
    },
    {
      id: "mfa", title: "Locate central CAP evaluation for NPS and MFA",
      path: ["Remote Desktop Gateway Manager", "Your gateway → Properties", "RD CAP Store", "Central server running NPS"],
      instruction: "The RD CAP Store tab locates central policy evaluation. In Microsoft's MFA design, the gateway sends RADIUS requests to a separate NPS server with the Entra MFA NPS extension; primary authentication and MFA precede acceptance. RD RAP remains on the gateway. Selecting a central server alone does not enable MFA.",
      image: `${rdsMedia}image10.png`,
      source: rdsMfa, screenshotSource: rdsMfa, screenshotCredit, screenshotLabel: rdsLabel,
      alt: "Windows Server 2016 gateway Properties RD CAP Store tab with Central server running NPS selected, a sample server name, Add button and empty server list.",
      imageNote: "dc1.contoso.com is the tutorial's sample input, not a prescribed NPS placement or evidence of an added server. Install the NPS extension on the separate NPS server, not the RD Gateway; review supported MFA methods and prerequisites.",
    },
  ],
};

// Exact reviewed identities; parent registry owns integration.
export const hybridWacRdsBindings: Record<string, AdVisualBinding> = {
  "az802-q-067": { guide: wacGateway, startStep: "gateway", context: "An on-premises WAC gateway is installed on the organization's server and shared through browser access." },
  "az802-q-068": { guide: wacGateway, startStep: "https", context: "443 is the usual HTTPS server-gateway port; current local Windows client mode uses 6600 and custom setup can override ports." },
  "az802-q-098": { guide: wacHybrid, startStep: "hybrid-services", context: "WAC Azure integration connects local management to service-specific Azure workflows." },
  "az802-q-081": { guide: rdsAccess, startStep: "session-host", context: "RDS Session Hosts provide published user sessions; ordinary administrative RDP is not an RDS deployment." },
  "az802-q-082": { guide: rdsAccess, startStep: "gateway", context: "Protect RDS with RD Gateway, appropriate strong authentication and restricted access; do not expose every host's RDP port." },
  "az802-q-317": { guide: rdsAccess, startStep: "gateway", context: "Publish the farm through RD Gateway, keep session hosts private and enforce approved source restrictions at network filters." },
};
