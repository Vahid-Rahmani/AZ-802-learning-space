import type { Question } from "./questions";

/** Supplemental corrections to the initial screenshot batch; identities are unchanged. */
export const existingQuestionCorrections: Record<string, Partial<Question>> = {
  "az802-q-010": {
    keyPoints: ["ntds.dit stores AD DS objects and their attributes.", "Writable controllers can originate directory changes; an RODC keeps a read-only directory replica updated through inbound replication.", "The directory database and SYSVOL use different replication mechanisms and health checks."],
    requirements: "Use the installed AD DS management tools. Inspecting database files with ntdsutil requires AD DS to be stopped or Directory Services Restore Mode; do not interrupt a production controller just to answer this question.",
    commandPath: [{ label: "Inspect database and log paths only in an approved offline/DSRM lab session", command: 'ntdsutil "activate instance ntds" files info quit quit' }],
    sourceRefs: ["https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/0xc00002e1-error-start-domain-controller", "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/rodc/install-a-windows-server-2012-active-directory-read-only-domain-controller--rodc---level-200-"],
  },
  "az802-q-019": {
    requirements: "Universal group membership is forest-wide directory information used during authorization. Multidomain logon normally needs a global catalog to retrieve universal membership, but configured Universal Group Membership Caching can serve previously cached membership locally. A local GC is not universally mandatory at every site.",
    sourceRefs: ["https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups", "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/replication/active-directory-replication-concepts"],
  },
  "az802-q-044": {
    keyPoints: ["AD DS uses DNS service records to locate directory controllers and services.", "An additional controller must resolve the existing domain through its internal DNS before promotion.", "For a first controller in a new forest, plan the namespace and authoritative DNS; existing domain-controller SRV records do not exist yet."],
    requirements: "Set DNS client addresses appropriate to the deployment. For an existing domain, validate its internal domain-controller locator records. The first controller of a new forest creates the domain DNS records during deployment; do not require nonexistent pre-promotion SRV records.",
    sourceRefs: ["https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/best-practices-for-dns-client-settings"],
  },
  "az802-q-045": {
    keyPoints: ["Internal authoritative DNS resolves the AD-specific host and service records needed for discovery and authentication.", "Public resolvers do not normally know a private AD namespace; using them as AD client DNS can break discovery and correct registration.", "Configure external resolution through the internal DNS server's forwarders or root hints, not by adding public client DNS as a supposed backup."],
    requirements: "Use DNS servers that can resolve the AD namespace. For a first/only controller running DNS, the client can point to its own address; additional controllers should use suitable internal AD DNS. A public resolver's presence does not automatically publish AD records to a public zone.",
    sourceRefs: ["https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/best-practices-for-dns-client-settings"],
  },
  "az802-q-046": {
    keyPoints: ["Graceful demotion coordinates directory removal with reachable controllers; check remaining services and replication afterwards.", "Ensure another healthy controller can provide DNS, global catalog and other required services before removing an extra controller.", "Transfer held FSMO roles while their owner is healthy. Seizure is a recovery action for an unavailable owner, not the normal removal procedure for a healthy controller."],
    commandPath: [{ label: "Preview demotion without changing the controller", command: "Uninstall-ADDSDomainController -WhatIf" }],
    requirements: "Demotion requires authorized domain credentials and appropriate remaining services. Review warnings and role ownership in the wizard. Removing the last controller deletes the domain; forced removal of an unreachable controller is a different recovery procedure requiring metadata cleanup.",
    sourceRefs: ["https://learn.microsoft.com/en-us/powershell/module/addsdeployment/uninstall-addsdomaincontroller?view=windowsserver2025-ps", "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/demoting-domain-controllers-and-domains--level-200-"],
  },
};
