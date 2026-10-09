import type { AdVisualBinding, AdVisualGuideData } from "./ad-visual-guide-types";

const source = "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/rodc/install-a-windows-server-2012-active-directory-read-only-domain-controller--rodc---level-200-";
const media = "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/rodc/media/install-a-windows-server-2012-active-directory-read-only-domain-controller--rodc---level-200-/";

/** Configure an unstaged RODC in an existing lab domain, before promotion. */
export const adRodcOptionsGuide: AdVisualGuideData = {
  id: "ad-rodc-password-replication-options",
  title: "AD DS · RODC and password replication options",
  source,
  versionNote: "Microsoft's annotated screenshots show Windows Server 2012. The linked guidance also applies to Windows Server 2016–2025; appearance can differ. These are promotion-wizard screens for an unstaged RODC, not the properties of an already deployed RODC.",
  prerequisites: "Use a prepared, isolated AD lab with an existing writable domain controller, internal AD DNS, a planned branch site and authorized deployment credentials. Install the AD DS role first, then start Promote this server to a domain controller. These steps review the RODC settings before installation.",
  steps: [
    {
      id: "existing-domain",
      title: "Choose the existing domain",
      path: ["Server Manager", "Notifications", "Promote this server to a domain controller", "Deployment Configuration", "Add a domain controller to an existing domain"],
      instruction: "Enter the lab domain and provide authorized domain credentials. An RODC needs an existing writable controller; it cannot be the first controller in a new domain.",
      image: `${media}adds_smi_tr_rodcdeployconfig.png`,
      alt: "Deployment Configuration with Add a domain controller to an existing domain selected, domain name and Change credentials button.",
    },
    {
      id: "read-only",
      title: "Select the read-only controller role",
      path: ["Domain Controller Options", "Read only domain controller (RODC)", "Site name", "DSRM password"],
      instruction: "Select RODC, choose the branch site and set the DSRM recovery password. DNS and Global Catalog are separate capabilities. The read-only role prevents originating directory writes; inbound replication still updates its local directory copy.",
      image: `${media}adds_smi_tr_rodcdcoptions.png`,
      alt: "Domain Controller Options with DNS, Global Catalog and Read only domain controller checked, site selection and masked DSRM fields.",
    },
    {
      id: "password-policy",
      title: "Review allowed and denied credential caching",
      path: ["RODC Options", "Accounts that are allowed to replicate passwords to the RODC", "Accounts that are denied from replicating passwords to the RODC"],
      instruction: "Review both Password Replication Policy lists for this RODC. Use the allowed list's Add button for a defined branch group and preserve privileged-account denials. Deny overrides Allow. Delegated administrator account controls local administration separately. Allow permits caching; it neither grants directory writes nor proves the password is already cached. With a reachable writable controller, an uncached sign-in can be forwarded for authentication.",
      image: `${media}adds_smi_tr_rodcoptions.png`,
      alt: "RODC Options sidebar selected, with delegated administrator account, allowed and denied password lists, Add buttons and a Deny precedence message.",
      imageNote: "Microsoft's reference image has RODC Options selected in the sidebar although the upper heading reads Preparation Options. Its group names and blue PowerShell annotations are examples. Allowed entries are permissions, not a list of passwords already cached.",
    },
  ],
};

export const rodcGuideBindings: Record<string, AdVisualBinding> = {
  "az802-q-013": {
    guide: adRodcOptionsGuide,
    startStep: "read-only",
    context: "The RODC checkbox chooses a read-only directory replica. The next screen separately limits credential caching and delegates local administration without requiring domain-wide administrator membership.",
  },
  "az802-q-014": {
    guide: adRodcOptionsGuide,
    startStep: "password-policy",
    context: "The allowed and denied lists are the RODC Password Replication Policy. They control permission to cache credentials; Group Policy password settings and DNS scavenging do not.",
  },
  "az802-q-301": {
    guide: adRodcOptionsGuide,
    startStep: "password-policy",
    context: "A successful forwarded authentication does not guarantee that the password is cached. The RODC's Password Replication Policy controls caching, with denied entries taking precedence.",
  },
};
