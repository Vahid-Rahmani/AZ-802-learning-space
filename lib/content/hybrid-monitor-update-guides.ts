import type { AdVisualBinding, AdVisualGuideData, AdVisualStep } from "./ad-visual-guide-types";

const sources = {
  assessment: "https://learn.microsoft.com/en-us/azure/update-manager/assessment-options",
  settings: "https://learn.microsoft.com/en-us/azure/update-manager/manage-update-settings",
  scheduling: "https://learn.microsoft.com/en-us/azure/update-manager/scheduled-patching",
  collection: "https://learn.microsoft.com/en-us/azure/azure-monitor/vm/data-collection",
  events: "https://learn.microsoft.com/en-us/azure/azure-monitor/vm/data-collection-windows-events",
};
const updateMedia = "https://learn.microsoft.com/en-us/azure/update-manager/media/";
const monitorMedia = "https://learn.microsoft.com/en-us/azure/azure-monitor/vm/media/";
const versionNote = "Original Microsoft Learn Azure portal screenshots, reviewed against their source articles. These are cloud interfaces, not Windows Server 2025 desktop captures. Names, dates, regions and selections belong to Microsoft's examples; portal labels can change. This walkthrough has not configured any Azure resources.";

function screenshot(step: Omit<AdVisualStep, "screenshotSource" | "screenshotCredit" | "screenshotLabel">): AdVisualStep {
  return {
    ...step,
    screenshotSource: step.source,
    screenshotCredit: "Microsoft Learn · Microsoft Azure documentation",
    screenshotLabel: "Official Microsoft Azure portal reference · interface may vary",
  };
}

const assessment: AdVisualGuideData = {
  id: "hybrid-update-assessment", title: "Azure Update Manager · assess hybrid update compliance",
  category: "Hybrid management", kind: "screenshot", source: sources.assessment, versionNote,
  prerequisites: "Use a supported, connected Azure VM or Arc-enabled lab server with Update Manager prerequisites and authorized read/update access. For Arc, verify Microsoft.Compute registration in the subscription. Assessment and installation are separate operations; Update Manager does not require a Log Analytics workspace.",
  steps: [
    screenshot({
      id: "periodic-assessment", title: "Locate the periodic assessment setting",
      path: ["Azure Update Manager", "Machines → select the lab machine", "Settings → Update settings", "Periodic assessment"],
      instruction: "Periodic assessment checks for missing updates every 24 hours. Locate the per-machine setting; saving a change in your lab enables future scans, not patch installation. Arc servers do not use the Azure VM patch orchestration options.",
      source: sources.settings, image: `${updateMedia}manage-update-settings/update-setting-to-change.png`,
      alt: "Azure Update Manager Change update settings showing an Arc-enabled server and Periodic assessment set to Enable (current).",
      imageNote: "The example Arc machine already shows Enable (current). The open patch-orchestration menu is an Azure VM option; the banner states it does not apply to Arc-enabled servers.",
    }),
    screenshot({
      id: "compliance-inventory", title: "Read the fleet's update assessment status",
      path: ["Azure Update Manager", "Machines", "Subscription and resource filters", "Pending updates → select a machine for details"],
      instruction: "Compare Pending updates, No pending updates and No updates data. Missing assessment data is not evidence of compliance. Open a machine's Updates view for its missing-update details and check assessment freshness before planning installation.",
      source: sources.assessment, image: `${updateMedia}updates-maintenance/periodic-assessment-expanded.png`,
      alt: "Azure Update Manager Machines summary with Total machines, No updates data, No pending updates, Pending updates and Pending reboot tiles.",
      imageNote: "This crop shows fleet counts and the periodic-assessment reminder, not an individual machine's KB list. The example's counts do not describe your environment.",
    }),
  ],
};

const scheduling: AdVisualGuideData = {
  id: "hybrid-update-maintenance", title: "Azure Update Manager · plan maintenance and phased patching",
  category: "Hybrid management", kind: "screenshot", source: sources.scheduling, versionNote,
  prerequisites: "Use an authorized lab maintenance configuration and a small pilot group. Creating or assigning a schedule changes future patching. Verify dependencies and recovery arrangements before production use. Azure VM scheduling requires Customer Managed Schedules; Arc servers do not require that VM setting.",
  steps: [
    screenshot({
      id: "guest-maintenance", title: "Choose guest operating-system maintenance",
      path: ["Azure Update Manager", "Schedule updates", "Create a maintenance configuration → Basics", "Maintenance scope → Guest"],
      instruction: "Guest scope covers OS updates on Azure VMs and Arc servers. Review the reboot setting, then add a schedule and the intended machine group before creating the configuration.",
      source: sources.scheduling, image: `${updateMedia}scheduled-updates/create-maintenance-configuration.png`,
      alt: "Create a maintenance configuration with Guest (Azure VM, Arc-enabled VMs/servers) selected, a reboot setting and Add a schedule.",
      imageNote: "The example is incomplete and displays Schedule cannot be empty for Guest patching. It is not evidence of a created schedule.",
    }),
    {
      id: "maintenance-window", title: "Set the time zone, window and recurrence",
      path: ["Guest maintenance configuration", "Add a schedule", "Start on and time zone", "Maintenance window → Repeats → End date"],
      instruction: "Match timing and reboot allowance to application availability. Give different rollout groups separate windows; review machine scope before saving.",
      source: sources.scheduling,
      alt: "Self-authored diagram: start time and time zone, maintenance duration and recurrence, then the selected machine rollout group.",
      imageNote: "Authored planning diagram based on the Microsoft procedure; not an Azure dialog screenshot. Confirm all schedule fields in your portal.",
      diagram: {
        title: "Guest maintenance schedule planning",
        nodes: [{ id: "start", label: "Start time + time zone" }, { id: "window", label: "Window + recurrence + end date" }, { id: "scope", label: "Selected rollout group" }],
        edges: [{ from: "start", to: "window" }, { from: "window", to: "scope" }],
      },
    },
    {
      id: "phased-validation", title: "Validate the pilot before the next phase",
      path: ["Pilot maintenance run", "Update Manager → History", "Application and server health checks", "Next rollout group"],
      instruction: "Review installation failures and pending reboots, then test workload health. Pause the next phase if the pilot is unhealthy. A successful patch status alone does not prove application availability.",
      source: sources.scheduling,
      alt: "Self-authored diagram: pilot maintenance window, patch results and workload health check, then decision to proceed or investigate.",
      imageNote: "Authored operational diagram; not an Azure screenshot or an automatic health gate provided by Update Manager.",
      diagram: {
        title: "Phased maintenance with a health decision",
        nodes: [{ id: "pilot", label: "Pilot group / window" }, { id: "validate", label: "Patch results + workload health" }, { id: "next", label: "Next group / later window" }, { id: "pause", label: "Pause and investigate" }],
        edges: [{ from: "pilot", to: "validate" }, { from: "validate", to: "next", label: "healthy" }, { from: "validate", to: "pause", label: "failure" }],
      },
    },
  ],
};

const monitor: AdVisualGuideData = {
  id: "hybrid-monitor-event-collection", title: "Azure Monitor · collect Windows events through AMA and a DCR",
  category: "Hybrid management", kind: "screenshot", source: sources.collection, versionNote,
  prerequisites: "A supported Windows lab machine connected to Azure or Azure Arc, Azure Monitor connectivity, an authorized Log Analytics workspace and permissions to create/associate a DCR. Review managed identity and agent prerequisites. Creating the rule or association changes telemetry collection; no Azure changes are performed by this walkthrough.",
  steps: [
    screenshot({
      id: "dcr-resources", title: "Associate the collection rule with the lab machine",
      path: ["Azure portal → Monitor", "Data Collection Rules → Create", "Basics → agent-based telemetry", "Resources → Add resources"],
      instruction: "Select the intended Azure VM or Arc server. The DCR association tells AMA which rule to use; the portal flow installs AMA when needed. Rule changes affect every associated machine. Use the region appropriate to the destination workspace.",
      source: sources.collection, image: `${monitorMedia}data-collection/default-resources-tab.png`,
      alt: "Azure Monitor Create Data Collection Rule Resources tab with Add resources and an empty resource list in the default creation experience.",
      imageNote: "The reference list is empty: no machine is yet associated. Its platform-telemetry region banner is not a Windows event log setting. This guide uses agent-based telemetry.",
    }),
    screenshot({
      id: "windows-event-source", title: "Define the Windows event logs to collect",
      path: ["Collect and deliver", "Add new dataflow / Add data source", "Windows Event Logs", "Basic log and severity selections"],
      instruction: "Choose the required logs and severities. This determines what AMA collects. Use Custom XPath filtering when needed; selecting a log does not select every severity automatically.",
      source: sources.events, image: `${monitorMedia}data-collection-windows-event/data-source-windows-event.png`,
      alt: "Add data source pane with Windows Event Logs and Basic selected; Critical and Error checked for Application and System.",
      imageNote: "The example excludes Warning, Information and Security events. Choose requirements for your own workload; current default experience may label this Add new dataflow.",
    }),
    screenshot({
      id: "log-analytics-destination", title: "Select where the events are delivered",
      path: ["Add data source / dataflow", "Destination → Add destination", "Azure Monitor Logs", "Authorized Log Analytics workspace"],
      instruction: "Select the workspace, then review the source, destination and machine associations before creating the DCR. Windows events collected this way are stored in the Event table.",
      source: sources.events, image: `${monitorMedia}data-collection/destination-workspace.png`,
      alt: "Add data source Destination tab showing Azure Monitor Logs and the example Log Analytics workspace my-workspace-01.",
      imageNote: "The workspace is an example. Azure Monitor Logs with a Log Analytics workspace is distinct from an Azure Monitor workspace used for other telemetry.",
    }),
    screenshot({
      id: "verify-events", title: "Verify actual event arrival in the workspace",
      path: ["Destination Log Analytics workspace", "Logs → Tables", "Event → Run", "Check machine and time range"],
      instruction: "Look for recent Event records from the intended machine. If absent, check AMA health, DCR association, selected severities, network access and query scope. Allow ingestion time after configuration.",
      source: sources.events, image: `${monitorMedia}data-collection-windows-event/verify-event.png`,
      alt: "Log Analytics workspace Logs view with Event table selected and example Windows event records visible.",
      imageNote: "This older tooltip mentions the Log Analytics agent. It illustrates the Event table, not a recommendation to deploy that legacy agent; this guide uses AMA.",
    }),
  ],
};

// Explicit reviewed AZ-802 identities; the parent registry retains exam/domain gating.
export const hybridMonitorUpdateBindings: Record<string, AdVisualBinding> = {
  "az802-q-072": { guide: assessment, startStep: "compliance-inventory", context: "See centralized update assessment across hybrid machines; installation schedules use maintenance configurations." },
  "az802-q-093": { guide: assessment, startStep: "periodic-assessment", context: "Periodic assessment inventories missing updates; it does not install them." },
  "az802-q-094": { guide: scheduling, startStep: "guest-maintenance", context: "Combine guest maintenance windows with staged groups and explicit workload health validation." },
  "az802-q-322": { guide: assessment, startStep: "periodic-assessment", context: "Locate Periodic assessment, then examine assessed missing-update status." },
  "az802-q-086": { guide: monitor, startStep: "dcr-resources", context: "Azure Monitor collects hybrid telemetry; this Windows-event example shows its agent and DCR workflow." },
  "az802-q-087": { guide: monitor, startStep: "windows-event-source", context: "AMA plus a DCR sends the selected Windows event logs to a central Log Analytics workspace." },
  "az802-q-088": { guide: monitor, startStep: "windows-event-source", context: "A DCR defines telemetry sources, collection settings and destinations; associations select machines." },
  "az802-q-321": { guide: monitor, startStep: "windows-event-source", context: "The DCR decides what AMA collects and where it is delivered." },
};
