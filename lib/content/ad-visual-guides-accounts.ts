import type { AdVisualBinding, AdVisualGuideData } from "./ad-visual-guide-types";

/** Official ADUC screenshots reviewed against these exact question identities. */
const ouCreationGuide: AdVisualGuideData = {
  id: "ad-create-organizational-unit",
  title: "AD DS · create an organizational unit",
  source: "https://learn.microsoft.com/en-us/azure/azure-arc/data/active-directory-prerequisites#create-an-ou",
  versionNote: "Microsoft's Azure Arc prerequisite article supplies these classic Active Directory Users and Computers screenshots. The image's Windows Server version is not identified; the OU creation dialog is also used in current AD DS management. contoso.local and arcou are the source's examples, not required domain or OU names.",
  prerequisites: "Use an existing AD DS lab domain, AD DS RSAT tools and an account allowed to create OUs in the chosen parent. Creating an OU changes the directory. This walkthrough ends at OU creation; the source's later Azure Arc service-account permissions are a separate configuration.",
  steps: [
    {
      id: "ou-menu",
      title: "Select the parent and create an OU",
      path: ["Active Directory Users and Computers (dsa.msc)", "Domain or parent OU", "Right-click", "New", "Organizational Unit"],
      instruction: "Open ADUC, locate the intended parent and choose New → Organizational Unit. The new OU will be a directory container for objects that share administration or policy settings.",
      image: "https://learn.microsoft.com/en-us/azure/azure-arc/data/media/active-directory-deployment/start-new-organizational-unit.png",
      alt: "Active Directory Users and Computers with contoso.local selected and New → Organizational Unit highlighted.",
      imageNote: "The source creates an Azure Arc OU at the domain root. Select your intended lab parent instead.",
    },
    {
      id: "ou-name",
      title: "Name the OU and keep deletion protection",
      path: ["New Object - Organizational Unit", "Create in", "Name", "Protect container from accidental deletion", "OK"],
      instruction: "Check Create in, enter your planned OU name and keep accidental-deletion protection selected. Choose OK and verify the OU appears under that parent. Creating the OU does not automatically populate it or grant its administrators permissions.",
      image: "https://learn.microsoft.com/en-us/azure/azure-arc/data/media/active-directory-deployment/new-organizational-unit.png",
      alt: "New Object - Organizational Unit dialog showing arcou in contoso.local and Protect container from accidental deletion checked.",
      imageNote: "arcou is the source's service-specific example. An OU is an administration and policy scope, not a security-group membership list.",
    },
  ],
};

const groupCreationGuide: AdVisualGuideData = {
  id: "ad-create-security-group-scope",
  title: "AD DS · create a security group and choose its scope",
  source: "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/component-updates/appendix-i--creating-management-accounts-for-protected-accounts-and-groups-in-active-directory#creating-a-group-to-enable-and-disable-management-accounts",
  versionNote: "Official Microsoft screenshots show the older Server 2012-era ADUC interface from the protected-account management appendix. The article applies to Windows Server 2016–2025. Only its ordinary group-creation screens are used here; the source's specialized management-account and privileged-group permissions are outside this walkthrough.",
  prerequisites: "Use an existing AD DS lab domain with AD DS RSAT and permission to create groups in a chosen OU. Decide the group's purpose and scope first. This workflow creates a new, empty security group; membership and resource ACL assignment require separate steps.",
  steps: [
    {
      id: "group-menu",
      title: "Create the group in its intended OU",
      path: ["Active Directory Users and Computers (dsa.msc)", "Target OU", "Right-click", "New", "Group"],
      instruction: "Select the OU that will hold your lab group, then choose New → Group. Use your own naming convention and OU rather than the source's administration hierarchy.",
      image: "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/component-updates/media/appendix-i--creating-management-accounts-for-protected-accounts-and-groups-in-active-directory/sad_115.png",
      alt: "Active Directory Users and Computers showing a selected administration OU and the New submenu containing Group.",
      imageNote: "The pictured PIM-RBAC hierarchy belongs to Microsoft's privileged-management example. This guide uses the same Group command for an ordinary lab group.",
    },
    {
      id: "group-scope",
      title: "Choose the scope and Security type",
      path: ["New Object - Group", "Group name", "Group scope", "Group type: Security", "OK"],
      instruction: "Enter a name. Choose Global to collect same-domain accounts by role, Universal for membership across domains in one forest, or Domain local for permissions on resources in the group's own domain, with eligible members from trusted domains. Select Security, then OK. Verify the new group's General tab. Scope selection alone does not grant resource access.",
      image: "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/component-updates/media/appendix-i--creating-management-accounts-for-protected-accounts-and-groups-in-active-directory/sad_116.png",
      alt: "New Object - Group dialog for DelegatedEnablers with Domain local, Global and Universal scope choices; Universal and Security are selected.",
      imageNote: "The source selects Universal for DelegatedEnablers. Choose the scope required by your question; the scope rules are documented at https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups#group-scope.",
    },
  ],
};


export const accountsGuideBindings: Record<string, AdVisualBinding> = {
  "az802-q-016": {
    guide: ouCreationGuide,
    startStep: "ou-menu",
    context: "The New → Organizational Unit path shows the directory container behind this answer. An OU can organize users, computers and other objects for administration and policy.",
  },
  "az802-q-017": {
    guide: groupCreationGuide,
    startStep: "group-scope",
    context: "Locate Domain local in Group scope: it can accept eligible members from trusted domains and receive permissions within its own domain. The reference image selects Universal; choose Domain local for this question.",
  },
  "az802-q-018": {
    guide: groupCreationGuide,
    startStep: "group-scope",
    context: "Locate Global in Group scope: use it to collect same-domain users by job function, such as HR or IT Support. The reference image selects Universal; select Global for this question. Grouping users and granting resource permissions are separate operations.",
  },
  "az802-q-019": {
    guide: groupCreationGuide,
    startStep: "group-scope",
    context: "Locate Universal in Group scope for membership spanning domains of the same forest. The screenshot already has Universal selected; creating the group is separate from adding its members.",
  },
};

// 020/021 need group nesting and resource-ACL screens, not just group creation.
// 054/304/305 need the OU-scoped password-reset delegation/read-permission UI;
// current official procedure pages provide text but no matching wizard screenshots.
