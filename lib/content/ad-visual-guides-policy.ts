/** Official ADAC screenshots, reviewed against the current Microsoft procedures. */
import type { AdVisualBinding, AdVisualGuideData } from "./ad-visual-guide-types";

const source = "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/adac/advanced-ad-ds-management-using-active-directory-administrative-center--level-200-";
const media = "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/adac/media/advanced-ad-ds-management-using-active-directory-administrative-center--level-200-/";

const passwordGuide: AdVisualGuideData = {
  id: "ad-fine-grained-password-policy",
  title: "AD DS · create and verify a password settings object",
  source,
  versionNote: "Microsoft's reference images show the Windows Server 2012-era AD Administrative Center (ADAC). Current Windows Server 2016–2025 guidance uses the same System → Password Settings Container workflow; layout and labels can differ.",
  prerequisites: "Use ADAC/RSAT, a domain administrator or appropriately delegated account, and an isolated lab with a test domain user/global security group. Current Microsoft guidance assumes domain functional level Windows Server 2012 or later. PSOs apply to domain users and global security groups, not OUs, local accounts or computer objects. Review password and lockout values before applying them.",
  steps: [
    {
      id: "password-new", title: "Open the password settings container",
      path: ["Server Manager", "Tools", "Active Directory Administrative Center", "Domain", "System", "Password Settings Container", "Tasks → New → Password Settings"],
      instruction: "Select the intended domain and open the container. Choose New → Password Settings to create a PSO rather than linking a password GPO to an OU.",
      image: `${media}adds_adac_tr_passwordsettings.png`,
      alt: "ADAC Tasks menu showing New and Password Settings in the Password Settings Container.",
    },
    {
      id: "password-values", title: "Define the PSO values",
      path: ["Create Password Settings", "Name", "Precedence", "Password and account lockout settings", "OK"],
      instruction: "Give the PSO a name and a distinct precedence value; smaller numbers have higher priority within the relevant assignment set. Set the required password and lockout fields using your lab plan, keep reversible encryption off, then save.",
      image: `${media}adds_adac_tr_createpasswordsettings.png`,
      alt: "Password Settings editor with name, precedence, password age, length, history and lockout fields.",
      imageNote: "This old image contains extreme example values and inconsistent password-age labels. Use it to locate fields; do not copy its numbers. Minimum password age must be less than maximum password age when maximum age is nonzero.",
    },
    {
      id: "password-assign", title: "Assign the saved policy to a global security group",
      path: ["Domain", "Test global security group", "Properties", "Password Settings", "Directly Associated Password Settings → Assign", "Select the PSO", "OK"],
      instruction: "Assign the saved PSO to your test global security group and confirm. This view lists direct associations; it does not show a user's policy inherited through group membership. Use a test group instead of the privileged group in the example.",
      image: `${media}adds_adac_tr_fgppsettings.gif`,
      alt: "Group properties showing Password Settings, Directly Associated Password Settings and the Assign button.",
      imageNote: "The reference group is Domain Admins. Select your own test global security group; assigning a PSO to a privileged group changes its members' password and lockout requirements.",
    },
    {
      id: "password-result", title: "Check the user's effective policy",
      path: ["Domain", "User's actual container", "Test domain user", "Right-click → View resultant password settings"],
      instruction: "Inspect the effective PSO for the user. A direct user assignment is considered before group assignments; within the applicable set, lower precedence wins. Equal values are resolved by the smaller objectGUID, not GPO link order. PowerShell equivalent: Get-ADUserResultantPasswordPolicy -Identity test1.",
      image: `${media}adds_adac_tr_rsop.png`,
      alt: "User context menu highlighting View resultant password settings.",
      imageNote: "The old image's heading says Deleted Objects although it shows normal user actions. Perform this check on a live domain user in its actual container, not in the Recycle Bin.",
    },
  ],
};

const recycleGuide: AdVisualGuideData = {
  id: "ad-recycle-bin-enable-restore",
  title: "AD DS · enable Recycle Bin and restore a deleted object",
  source,
  versionNote: "Microsoft screenshots show the Windows Server 2012-era ADAC, including an older Deleted Objects view. Current Windows Server 2016–2025 guidance retains the Enable Recycle Bin and Restore actions. This is online Recycle Bin recovery, not a backup-based authoritative restore.",
  prerequisites: "Use a lab forest with forest/domain functional levels at least Windows Server 2008 R2 and ADAC/RSAT. Use Enterprise Admin rights for forest-wide activation and appropriate restore rights. Activation is irreversible and must replicate across controllers. Only objects deleted after activation and still within the deleted-object lifetime are recoverable here. Recycle Bin does not replace tested AD backups or forest recovery planning.",
  steps: [
    {
      id: "recycle-enable", title: "Enable the forest feature deliberately",
      path: ["Server Manager", "Tools", "Active Directory Administrative Center", "Forest root domain", "Tasks → Enable Recycle Bin", "Confirmation → OK", "Refresh → F5"],
      instruction: "Verify the intended forest before confirming the irreversible change. Acknowledge the refresh message and allow configuration replication to finish. If already enabled, continue to Deleted Objects; a disabled action can also indicate insufficient functional level.",
      image: `${media}adds_adac_tr_enablerecyclebin.png`,
      alt: "ADAC domain Tasks menu highlighting Enable Recycle Bin.",
      imageNote: "This image shows the menu command, not the irreversible-change confirmation dialog. Read that warning before confirming in your own lab.",
    },
    {
      id: "recycle-find", title: "Locate the specific deleted object",
      path: ["ADAC", "Target domain", "Deleted Objects", "Filter by name / deletion time"],
      instruction: "Open Deleted Objects and narrow the results to the intended account. Check its name, deletion time and last known parent; do not restore every deleted object. If its parent OU is missing, restore that parent first or choose an existing destination with Restore To.",
      image: `${media}adds_adac_tr_deletedobjectscontainer.png`,
      alt: "ADAC domain view with the Deleted Objects container selected and Enable Recycle Bin unavailable after activation.",
    },
    {
      id: "recycle-restore", title: "Restore and verify the account",
      path: ["Deleted Objects", "Selected account", "Right-click → Restore", "Original container"],
      instruction: "Restore returns the selected object to its original container; Restore To selects another location. Confirm the account appears at the destination, then check its identity and group memberships. Creating a new account with the same name creates a different identity.",
      image: `${media}adds_adac_tr_restoresingle.gif`,
      alt: "Deleted user selected in ADAC with Restore and Restore To available in its context menu and Tasks pane.",
    },
  ],
};

// Exact identities only. q050 is authoritative restore, not this Recycle Bin workflow.
// q308/q309 have conflicting bank explanations; omit until separately reviewed.
export const policyGuideBindings: Record<string, AdVisualBinding> = {
  "az802-q-025": { guide: passwordGuide, startStep: "password-new", context: "A fine-grained password policy is a PSO. Follow the ADAC sequence to create one, assign it to a global security group and inspect the user's effective settings." },
  "az802-q-026": { guide: passwordGuide, startStep: "password-assign", context: "An OU-linked password GPO does not give selected domain users separate domain password requirements. Use a PSO assigned to a user or global security group, then check resultant password settings." },
  "az802-q-051": { guide: recycleGuide, startStep: "recycle-enable", context: "The Recycle Bin forest feature must be enabled before the relevant deletion. Enabling it afterwards cannot make an earlier deletion recoverable through this workflow." },
};
