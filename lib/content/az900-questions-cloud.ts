/**
 * Authored AZ-900 questions for the "Describe cloud concepts" domain.
 *
 * Every draft here was written against the Learn pages listed for that
 * objective in `az900-build.ts`. `rationale` is the reviewed explanation shown
 * right after answering, `keyPoints` are the deciding facts, and `whyOthers`
 * gives the specific reason each distractor fails.
 */

import type { AuthoredBank } from "./az900-build.ts";

export const cloudConceptDrafts: AuthoredBank = {
  "define-cloud-computing": [
    {
      question: "A company wants to replace its on-premises server room with services it consumes over the internet, without buying any hardware. Which definition of cloud computing matches this plan?",
      correct: "Delivering computing services over the internet on demand, with resources pooled from provider infrastructure and paid for by usage",
      wrong: [
        "Purchasing dedicated hardware in a colocation facility the company owns and racks itself",
        "Running software only on employee laptops with no shared infrastructure",
        "Using a private satellite link to reach a single dedicated server",
      ],
      rationale: "Cloud computing is the delivery of computing services - compute, storage, networking, and similar resources - over the internet, on demand, from pooled provider infrastructure and billed by consumption. The company rents capacity instead of buying hardware.",
      keyPoints: [
        "Cloud computing is a delivery model, not a product you install.",
        "Resources are pooled across many tenants and consumed on demand over the internet.",
        "The customer pays for use rather than owning the underlying hardware.",
      ],
      whyOthers: [
        "Owning and racking dedicated hardware is the on-premises or colocation model the plan is moving away from.",
        "Laptop-only software with no pooled shared infrastructure is not cloud computing; there is no on-demand elastic service.",
        "A single dedicated server on a private link is dedicated infrastructure, not pooled on-demand cloud capacity.",
      ],
      difficulty: "easy",
      topic: "Cloud computing",
    },
    {
      question: "Which statement about cloud computing is accurate?",
      correct: "It shifts the buying decision from capital equipment to a service the customer consumes and pays for as it is used",
      wrong: [
        "It eliminates the customer's responsibility for operating whatever it deploys",
        "It requires every workload to run on hardware owned by the customer",
        "It can only be used by organizations with no existing on-premises systems",
      ],
      rationale: "Moving to cloud changes the economic model from upfront capital purchase to consumption-based service. It does not remove operational responsibility, does not require customer-owned hardware, and hybrid adoption is normal.",
      keyPoints: [
        "The defining economic shift is from capex purchase to usage-based service consumption.",
        "Customer responsibility changes with the service model, it does not disappear.",
        "Existing on-premises estate is normally kept and connected, not a blocker.",
      ],
      whyOthers: [
        "Operational responsibility depends on the service model and remains with the customer for IaaS and most of PaaS.",
        "Cloud computing specifically means using provider infrastructure, the opposite of customer-owned hardware.",
        "Hybrid use of existing on-premises systems alongside cloud is the standard pattern.",
      ],
      difficulty: "easy",
      topic: "Cloud computing",
    },
    {
      question: "Why do cloud providers offer many similar services over shared infrastructure?",
      correct: "To pool capacity across many customers so that resources can be allocated on demand instead of being reserved per customer",
      wrong: [
        "To give each customer dedicated physical servers that no one else can use",
        "To avoid the need for any form of usage-based accounting",
        "To guarantee that each tenant's data is stored on separate hardware",
      ],
      rationale: "Multitenancy and pooling are how cloud providers deliver capacity efficiently: the provider builds large pools and allocates portions to customers on demand. Isolation is achieved logically, not by dedicating hardware to each tenant.",
      keyPoints: [
        "Pooling lets the provider serve many customers from shared capacity.",
        "Tenant isolation is logical - identity, networking, encryption - not physical dedication.",
        "Shared infrastructure is what makes on-demand provisioning and elasticity possible.",
      ],
      whyOthers: [
        "Dedicated hardware per customer is the opposite of pooled multi-tenant cloud infrastructure.",
        "Usage-based metering is central to cloud billing, not something pooling avoids.",
        "Data separation in a multi-tenant service is enforced logically and cryptographically, not by separate disks.",
      ],
      difficulty: "medium",
      topic: "Cloud computing",
    },
    {
      question: "What does elasticity let a customer do that fixed on-premises capacity cannot?",
      correct: "Increase or decrease capacity in response to demand without provisioning permanent hardware",
      wrong: [
        "Run on hardware permanently dedicated to a single organization",
        "Avoid paying for any capacity that is not in use at a given moment",
        "Guarantee that application performance never changes",
      ],
      rationale: "Elasticity is the ability to scale capacity up and down with demand on short notice, which fixed hardware cannot do. It does not promise zero cost for idle capacity, since many services still carry baseline charges, and it does not guarantee constant performance.",
      keyPoints: [
        "Elasticity means capacity tracks demand quickly, in either direction.",
        "Fixed on-premises hardware cannot follow demand without buying and installing capacity.",
        "Elastic capacity still has baseline costs, and it is a scaling property rather than a performance guarantee.",
      ],
      whyOthers: [
        "Permanently dedicated hardware is the dedicated/private cloud pattern, not elasticity.",
        "Elasticity reduces cost when scaled down but does not make all charges disappear; many services bill for provisioned capacity.",
        "Consistent performance is a reliability and design goal, not something elasticity guarantees.",
      ],
      difficulty: "medium",
      topic: "Cloud computing",
    },
  ],

  "shared-responsibility-model": [
    {
      question: "Under the shared responsibility model, who is responsible for security of the physical facilities, servers, and virtualization layer?",
      correct: "The cloud provider",
      wrong: ["The customer", "The customer and the provider equally", "Neither party; it is the responsibility of the internet service provider"],
      rationale: "The cloud provider secures the physical infrastructure: datacenters, servers, storage hardware, networking, and the virtualization layer. The customer's responsibility begins with the operating system and data on top of that layer.",
      keyPoints: [
        "The provider owns and secures the datacenter, hardware, and virtualization layer.",
        "Customer responsibility starts at the guest operating system and the customer's data and applications.",
        "The boundary moves depending on IaaS, PaaS, or SaaS.",
      ],
      whyOthers: [
        "The customer does not control or secure the physical facilities or the hypervisor.",
        "It is a division of duties, not an equal split; each layer has a defined owner.",
        "The internet service provider carries traffic and has no responsibility for the customer's Azure workloads.",
      ],
      difficulty: "easy",
      topic: "Shared responsibility model",
    },
    {
      question: "A customer uses Azure Virtual Machines. Who must install security updates inside the guest operating system?",
      correct: "The customer",
      wrong: [
        "Microsoft, because the guest operating system is part of the Azure platform",
        "The provider, because all Azure infrastructure is managed by Microsoft",
        "Nobody, because Azure automatically patches guest operating systems",
      ],
      rationale: "For virtual machines the customer manages the guest operating system, so the customer patches it. Microsoft patches the physical hosts and the virtualization layer beneath the guest, but it does not patch operating systems running as customer workloads.",
      keyPoints: [
        "In IaaS the customer operates and patches the guest OS and everything installed on it.",
        "The provider patches the hypervisor and host layer only.",
        "Azure does not patch guest operating systems for IaaS customers.",
      ],
      whyOthers: [
        "The guest OS is a customer workload, not part of the Azure platform layer.",
        "Microsoft's responsibility stops below the guest; it is not an all-inclusive patch scope.",
        "Automatic guest OS patching is exactly the IaaS responsibility the customer keeps.",
      ],
      difficulty: "easy",
      topic: "Shared responsibility model",
    },
    {
      question: "How does customer responsibility change when moving from IaaS to SaaS?",
      correct: "Customer responsibility decreases because the provider operates more of the stack, down to the application itself in SaaS",
      wrong: [
        "Customer responsibility increases because SaaS gives more customization options",
        "Customer responsibility stays identical across IaaS, PaaS, and SaaS",
        "Customer responsibility disappears entirely once the application is SaaS",
      ],
      rationale: "Responsibility follows control. With SaaS the provider runs the application, runtime, and data, so the customer only configures and uses it. Responsibility never reaches zero - the customer still governs identity, access, and data classification.",
      keyPoints: [
        "More provider-managed layers means fewer customer-managed layers.",
        "With SaaS the provider operates the application and data; the customer governs access and usage.",
        "The shift is a reduction in operational responsibility, not its elimination.",
      ],
      whyOthers: [
        "SaaS offers less customization, not more, so it does not increase responsibility.",
        "Responsibility clearly differs by service model; that difference is the whole point of the model.",
        "Some customer duties always remain, including identity, access control, and data classification decisions.",
      ],
      difficulty: "medium",
      topic: "Shared responsibility model",
    },
    {
      question: "Which responsibility stays with the customer even when an application is delivered as SaaS?",
      correct: "Governing who is allowed to sign in and what the application data is used for",
      wrong: [
        "Patching the servers that run the SaaS application",
        "Securing the physical datacenters that host the SaaS application",
        "Updating the hypervisor that runs the SaaS tenant",
      ],
      rationale: "Even with SaaS, the customer remains responsible for its own users, sign-in policy, access decisions, and data classification and use. Everything from the datacenter upward belongs to the provider.",
      keyPoints: [
        "Identity, access, and data governance are customer duties in every service model.",
        "Datacenter, hardware, and virtualization layers are provider duties in every service model.",
        "The shared responsibility boundary moves, it never fully disappears.",
      ],
      whyOthers: [
        "Server patching is the provider's job in SaaS, since the provider operates the infrastructure.",
        "Physical datacenter security is the provider's responsibility.",
        "The hypervisor is provider-managed; customers do not patch or update it.",
      ],
      difficulty: "medium",
      topic: "Shared responsibility model",
    },
  ],

  "cloud-models": [
    {
      question: "An Azure customer uses virtual machines, storage, and networking provided from Microsoft-owned datacenters shared with other customers. Which cloud model is this?",
      correct: "Public cloud",
      wrong: ["Private cloud", "Hybrid cloud", "On-premises private cloud"],
      rationale: "A public cloud runs on infrastructure owned and operated by a provider and made available over public networks, with logical isolation between tenants. Azure is a public cloud.",
      keyPoints: [
        "Public cloud = provider-owned infrastructure delivered over public networks.",
        "Tenants share the underlying infrastructure with logical isolation.",
        "Hybrid means combining public cloud with private or on-premises resources.",
      ],
      whyOthers: [
        "A private cloud is dedicated to a single organization, which shared Microsoft infrastructure is not.",
        "Hybrid requires a combination of environments; a pure Azure deployment is not hybrid by itself.",
        "On-premises private cloud means the customer owns the hardware, which is not the case here.",
      ],
      difficulty: "easy",
      topic: "Cloud models",
    },
    {
      question: "A company operates its own hypervisor cluster in its own datacenter and also runs some workloads in Azure. Which cloud model is this?",
      correct: "Hybrid cloud",
      wrong: ["Public cloud", "Private cloud", "Community cloud"],
      rationale: "A hybrid cloud combines a private or on-premises environment with public cloud services, usually connected so workloads and data can move between them. This setup has both.",
      keyPoints: [
        "Hybrid = private or on-premises plus public cloud, connected.",
        "Hybrid designs use VPN or ExpressRoute to link the environments.",
        "Hybrid is the normal pattern when existing on-premises estate must be kept.",
      ],
      whyOthers: [
        "Public cloud alone means only provider infrastructure; the company's own cluster rules that out.",
        "Private cloud alone means only dedicated single-organization infrastructure, with no Azure component.",
        "Community cloud serves organizations with shared community interests, not a mix of on-premises and Azure.",
      ],
      difficulty: "easy",
      topic: "Cloud models",
    },
    {
      question: "A retail chain builds a dedicated private cloud in its own datacenter, including its own hypervisor and storage. Which statement about this private cloud is correct?",
      correct: "It is dedicated to a single organization, but the organization still owns and operates the hardware and virtualization layer",
      wrong: [
        "It is operated by Microsoft and therefore subject to the Azure shared responsibility model",
        "It is the cheapest option because a single organization avoids multi-tenant overhead",
        "It provides the same automatic scaling as a public cloud without additional work",
      ],
      rationale: "A private cloud is dedicated to one organization, which bears the cost and effort of running that infrastructure. It does not inherit public-cloud economics or turnkey operations.",
      keyPoints: [
        "Private cloud = single-tenant infrastructure operated by the organization itself.",
        "The organization keeps hardware, hypervisor, and operational responsibility.",
        "Public-cloud convenience such as instant elastic scaling does not come for free.",
      ],
      whyOthers: [
        "A private cloud in the organization's own datacenter is not operated by Microsoft, so the Azure shared responsibility model does not apply.",
        "Running dedicated infrastructure is generally more expensive than consuming shared public-cloud capacity.",
        "Elastic scaling requires platform features that a self-managed private cloud does not provide automatically.",
      ],
      difficulty: "medium",
      topic: "Cloud models",
    },
    {
      question: "A multinational must keep a regulated workload in a jurisdiction with dedicated infrastructure operated by a national authority. Which cloud model fits?",
      correct: "Sovereign cloud, a form of cloud dedicated to a specific government or jurisdiction",
      wrong: [
        "Public cloud in the nearest available region, which ignores the jurisdiction requirement",
        "Private cloud in the organization's own datacenter, which avoids the provider entirely",
        "Community cloud shared between organizations in the same industry",
      ],
      rationale: "Sovereign clouds are operated by or for a specific government or jurisdiction with operational and legal control meeting local requirements. They are distinct from ordinary public regions.",
      keyPoints: [
        "Sovereign clouds exist for legal, regulatory, and operational jurisdiction requirements.",
        "They are separated from ordinary commercial public regions by law and operation.",
        "An ordinary public region does not satisfy a jurisdiction-specific mandate.",
      ],
      whyOthers: [
        "Deploying to the nearest public region ignores the stated jurisdictional constraint.",
        "Private cloud in the organization's own datacenter does not use a sovereign provider environment.",
        "Community cloud shares infrastructure between organizations with common interests, not with a government authority.",
      ],
      difficulty: "medium",
      topic: "Cloud models",
    },
  ],

  "cloud-model-use-cases": [
    {
      question: "A bank must keep its core ledger in its own datacenter while running its customer-facing portal in Azure. Which cloud model is this arrangement?",
      correct: "Hybrid cloud",
      wrong: ["Public cloud", "Private cloud", "SaaS"],
      rationale: "Keeping regulated data on-premises while running public-facing services in Azure combines a private or on-premises environment with public cloud, which is the definition of hybrid.",
      keyPoints: [
        "Splitting regulated and public-facing workloads across two environments is a hybrid pattern.",
        "Hybrid designs connect the environments so identity, data, or routing can cross.",
        "Neither a pure public nor a pure private deployment keeps data on-premises.",
      ],
      whyOthers: [
        "Public cloud would mean the ledger also runs in Azure, which the requirement excludes.",
        "Private cloud would mean everything runs on dedicated single-organization infrastructure, but the portal is on Azure.",
        "SaaS describes a delivery model for an application, not a combination of on-premises and cloud.",
      ],
      difficulty: "easy",
      topic: "Cloud model use cases",
    },
    {
      question: "A legal services firm needs email, document collaboration, and chat without building or operating any server. Which cloud model suits it best?",
      correct: "Public cloud, consuming SaaS services",
      wrong: [
        "Private cloud with a dedicated virtualization cluster the firm operates itself",
        "On-premises infrastructure with capacity for the full workload",
        "Hybrid cloud with an ExpressRoute circuit to a colocation provider",
      ],
      rationale: "The firm wants a fully managed application with no infrastructure of its own. Consuming SaaS from a public cloud provider is the lowest-touch option and matches the stated constraint.",
      keyPoints: [
        "Needing no infrastructure of its own points to SaaS consumption.",
        "SaaS is normally delivered from a public cloud provider.",
        "Dedicated or on-premises options contradict the stated constraint.",
      ],
      whyOthers: [
        "A private cloud requires the firm to operate its own hypervisor and hardware, which it explicitly does not want.",
        "On-premises requires buying and running servers, the opposite of the requirement.",
        "Hybrid connectivity is unnecessary when no on-premises estate needs to be linked.",
      ],
      difficulty: "easy",
      topic: "Cloud model use cases",
    },
    {
      question: "A startup wants to launch a product this week without purchasing hardware and without designing a datacenter. What is the most direct cloud approach?",
      correct: "Consume public cloud resources on demand and pay only for what is used",
      wrong: [
        "Build a private cloud first so the workload can move to public cloud later",
        "Buy servers now to avoid the risk of capacity limits",
        "Sign a long-term commitment for reserved capacity before measuring demand",
      ],
      rationale: "The constraint is speed and no hardware purchase. On-demand public cloud consumption satisfies both. Designing a private cloud or committing to reserved capacity in advance contradicts the stated needs.",
      keyPoints: [
        "On-demand public cloud removes both the purchase delay and the hardware cost.",
        "Usage-based pricing matches a startup with unmeasured demand.",
        "Reserving capacity before measuring demand is a commitment the scenario does not justify.",
      ],
      whyOthers: [
        "Building a private cloud is a large infrastructure project that defeats the launch-this-week goal.",
        "Buying hardware reintroduces exactly the delay and capital cost being avoided.",
        "A reserved commitment made before measuring demand risks paying for unused capacity.",
      ],
      difficulty: "easy",
      topic: "Cloud model use cases",
    },
    {
      question: "A manufacturer must connect its on-premises plants to Azure for a global rollout, with predictable latency and no internet path for production traffic. Which model and connection apply?",
      correct: "Hybrid cloud connected by ExpressRoute, a private dedicated connection through a connectivity provider",
      wrong: [
        "Public cloud only, with all plants exposing services directly to the internet",
        "Private cloud only, with Azure services replicated into the plants",
        "Hybrid cloud connected by a consumer broadband link with no service provider",
      ],
      rationale: "The requirement is to keep on-premises plants and connect them to Azure with predictable, non-internet production traffic. That is a hybrid cloud using ExpressRoute.",
      keyPoints: [
        "ExpressRoute provides private dedicated connectivity to Microsoft cloud through a provider.",
        "It avoids sending production traffic over the public internet.",
        "Hybrid is the model when on-premises and Azure must operate together.",
      ],
      whyOthers: [
        "Exposing plant services to the internet does not meet the stated requirement.",
        "Replicating Azure services into plants abandons the Azure rollout described in the scenario.",
        "A consumer broadband link has no service-level commitment and is not a dedicated private connection.",
      ],
      difficulty: "medium",
      topic: "Cloud model use cases",
    },
    {
      question: "A government agency is required to run its data only within a jurisdiction it controls, with infrastructure operated by a national authority. Which cloud model is required?",
      correct: "Sovereign cloud",
      wrong: ["Public cloud in the nearest region", "Private cloud owned by the agency", "Hybrid cloud with on-premises and public cloud"],
      rationale: "A requirement that data stay within a jurisdiction operated by a national authority describes a sovereign cloud, which is distinct from a commercial public region.",
      keyPoints: [
        "Sovereign clouds are governed by a specific country or jurisdiction.",
        "Data residency and operational control are the deciding constraints.",
        "Ordinary public regions do not satisfy a legal jurisdiction mandate.",
      ],
      whyOthers: [
        "A commercial public region is operated by the provider under commercial terms, not by the national authority.",
        "A private cloud owned by the agency is a different model and does not use a sovereign provider environment.",
        "Hybrid adds an on-premises component that the requirement does not call for.",
      ],
      difficulty: "medium",
      topic: "Cloud model use cases",
    },
    {
      question: "A hospital keeps medical imaging archives on-premises for regulatory reasons and runs its patient scheduling portal on Azure App Service. Which model does this describe?",
      correct: "Hybrid cloud",
      wrong: [
        "Public cloud, because the portal is a managed Azure service",
        "Private cloud, because the imaging archive is not in Azure",
        "Sovereign cloud, because the archive is on-premises",
      ],
      rationale: "The decisive factor is the combination of environments. Workloads are split across on-premises and Azure, which is hybrid regardless of which service type runs where.",
      keyPoints: [
        "Hybrid is defined by combining environments, not by individual service choices.",
        "A regulated on-premises store alongside an Azure service is a hybrid arrangement.",
        "Model choice follows the deployment topology, not the service type.",
      ],
      whyOthers: [
        "Public cloud would require all workloads, including the archive, to run in Azure.",
        "Private cloud would mean no Azure services are involved.",
        "Sovereign cloud is about provider jurisdiction, which is not the constraint described.",
      ],
      difficulty: "medium",
      topic: "Cloud model use cases",
    },
    {
      question: "A design studio needs isolated storage and compute that no other tenant can access, deployed in its own datacenter. Which model applies?",
      correct: "Private cloud, dedicated to a single organization",
      wrong: [
        "Public cloud, because it is cheaper to provision on demand",
        "Sovereign cloud, because the data is sensitive",
        "Community cloud, because several studios share the industry",
      ],
      rationale: "Single-tenant isolation in the organization's own datacenter is a private cloud. Sensitivity alone does not make it sovereign, and shared industry infrastructure is community cloud.",
      keyPoints: [
        "Private cloud means dedicated infrastructure serving one organization.",
        "Single-tenant isolation is the defining requirement, not cost.",
        "Sovereign cloud is about legal jurisdiction, community cloud about shared industry use.",
      ],
      whyOthers: [
        "Public cloud is multi-tenant by default, which contradicts the isolation requirement.",
        "Sovereign cloud depends on provider jurisdiction, not on isolation in the customer's own datacenter.",
        "Community cloud is shared across organizations, which contradicts dedicated isolation.",
      ],
      difficulty: "medium",
      topic: "Cloud model use cases",
    },
  ],

  "consumption-based-model": [
    {
      question: "A team runs a batch job that runs for two hours a night and is stopped the rest of the day. Which model best describes how it should be paid for?",
      correct: "Consumption-based model, paying for the hours and resources the job actually uses",
      wrong: [
        "A flat annual license for dedicated hardware reserved for the full year",
        "A capacity reservation purchased in advance for continuous availability",
        "A fixed monthly charge that ignores how long the job runs",
      ],
      rationale: "Consumption-based billing charges for what is used. A job that runs intermittently is the clearest case for paying per use rather than paying to hold capacity around the clock.",
      keyPoints: [
        "Consumption-based pricing meters actual usage rather than reserved capacity.",
        "Intermittent workloads avoid paying for idle time.",
        "Committed capacity models suit steady, predictable load.",
      ],
      whyOthers: [
        "Reserving hardware for a full year contradicts an intermittent workload.",
        "Capacity reservations are intended for steady, predictable demand.",
        "A fixed charge that ignores usage would overcharge for an intermittent job.",
      ],
      difficulty: "easy",
      topic: "Consumption-based model",
    },
    {
      question: "What is the main financial benefit of the consumption-based model for a startup?",
      correct: "It converts large capital purchases into smaller usage-based operating expenses that scale down when demand falls",
      wrong: [
        "It guarantees a fixed monthly cost regardless of how much is consumed",
        "It removes the need to forecast capacity before deploying",
        "It makes infrastructure free until the company grows",
      ],
      rationale: "The benefit is elasticity of spend: capital expenditure becomes operating expenditure, and cost tracks usage. It does not fix costs, remove the need for capacity planning, or make resources free.",
      keyPoints: [
        "Capex becomes opex, which suits organizations with limited upfront capital.",
        "Spend falls when usage falls, which is the elasticity of the consumption model.",
        "Capacity planning is still required; metering measures usage rather than predicting it.",
      ],
      whyOthers: [
        "Consumption pricing varies with usage, so it is not a guaranteed fixed cost.",
        "Right-sizing still requires forecasting expected demand.",
        "Resources are billed from the moment they exist, whether or not the company has grown.",
      ],
      difficulty: "easy",
      topic: "Consumption-based model",
    },
    {
      question: "A virtual machine is stopped but not deallocated at the end of each workday to keep its IP address. How does this affect consumption-based billing?",
      correct: "Compute charges continue for the allocated capacity because only deallocation stops compute billing",
      wrong: [
        "All charges stop the moment the virtual machine is stopped",
        "Charges continue at the same rate as an actively running workload",
        "Only storage charges continue and compute billing stops automatically",
      ],
      rationale: "A stopped-but-allocated VM still reserves capacity and continues to incur compute charges. Deallocating releases the underlying compute and stops compute billing, which is why a stop without deallocate is a common and expensive mistake.",
      keyPoints: [
        "Stopped but allocated still reserves and bills compute capacity.",
        "Deallocation releases the compute allocation and stops compute charges.",
        "Storage charges continue either way, since the disks remain.",
      ],
      whyOthers: [
        "Stopping without deallocating deliberately keeps the VM allocated and billing compute.",
        "A stopped VM costs less than a running one but is not free of compute charges.",
        "Compute billing continues until deallocation; it does not stop on stop.",
      ],
      difficulty: "medium",
      topic: "Consumption-based model",
    },
    {
      question: "Why is a serverless function often cheaper than an always-running virtual machine for an infrequent event?",
      correct: "The function is billed per execution and can scale to zero, so no capacity is held while nothing happens",
      wrong: [
        "The function runs on dedicated hardware that the provider keeps reserved for the customer",
        "Serverless services have a fixed monthly base charge lower than any virtual machine",
        "The virtual machine must be running continuously even when idle, so both cost the same",
      ],
      rationale: "Consumption-based serverless billing is per execution, and idle functions can scale to zero, so nothing is charged between events. A virtual machine holds allocated capacity continuously and bills for it.",
      keyPoints: [
        "Per-execution billing means infrequent work is charged only when it runs.",
        "Scaling to zero removes idle capacity charges entirely.",
        "An allocated virtual machine bills for reserved capacity whether or not it is busy.",
      ],
      whyOthers: [
        "Serverless platforms run on shared provider infrastructure, not dedicated customer hardware.",
        "Serverless avoids a capacity charge rather than offering a fixed lower base charge.",
        "An idle virtual machine still incurs compute charges, which is exactly the cost serverless avoids.",
      ],
      difficulty: "medium",
      topic: "Consumption-based model",
    },
  ],

  "cloud-pricing-models": [
    {
      question: "A workload runs continuously for three years with steady, predictable CPU and memory use. Which pricing model is most likely to reduce its cost?",
      correct: "A commitment or reservation that pays in advance for a known amount of compute",
      wrong: [
        "Pay-as-you-go only, because flexibility always costs less than commitment",
        "A free-tier credit, which applies only to the first month of service",
        "Spot pricing, which is discounted but can be evicted at any time",
      ],
      rationale: "Predictable, long-running usage is the textbook case for commitment-based pricing. Reserved instances or savings plans commit to a term and quantity in exchange for a lower effective rate. Spot does not fit continuous, predictable work because instances can be evicted.",
      keyPoints: [
        "Commitment pricing rewards steady, predictable usage over a term.",
        "Pay-as-you-go rewards variable or uncertain demand.",
        "Spot is discounted but evictable, so it suits interruptible work.",
      ],
      requirements: "Reserved instances are scoped to a specific region and size family for a term of one or three years. Savings plans are scoped to a region but apply across instance families, including pay-as-you-go and reserved instances.",
      whyOthers: [
        "Pay-as-you-go is typically the most expensive way to buy steady long-term usage.",
        "Free tier credits are promotional and limited, not a pricing model for a three-year workload.",
        "Spot instances can be evicted at any time, which is unacceptable for continuous steady work.",
      ],
      difficulty: "easy",
      topic: "Cloud pricing models",
    },
    {
      question: "What is the trade-off when a customer buys a reserved instance for virtual machines?",
      correct: "Lower cost in exchange for a commitment to a specific region, size family, and term, with less flexibility",
      wrong: [
        "Lower cost with no restrictions on region, size, or duration",
        "Higher cost in exchange for guaranteed unlimited performance",
        "Lower cost and the ability to move the reservation freely between all regions and sizes",
      ],
      rationale: "Reservations trade flexibility for price. The reservation is scoped to a region and size family for a term, and Azure also offers savings plans for broader flexibility. That commitment is exactly what produces the discount.",
      keyPoints: [
        "The discount is paid for with commitment and reduced flexibility.",
        "Reserved instances are scoped to a region and size family for a defined term.",
        "Savings plans are the more flexible commitment option for consistent usage across instances.",
      ],
      whyOthers: [
        "The discount is conditional on scope and term; it is not unconditional.",
        "Reservations reduce cost and do not increase it or guarantee unlimited performance.",
        "Moving a reservation freely across all regions and sizes is not how reserved instances work.",
      ],
      difficulty: "medium",
      topic: "Cloud pricing models",
    },
    {
      question: "A team runs fault-tolerant batch processing that can be interrupted and retried. Which pricing model offers the deepest discount?",
      correct: "Spot instances, which use spare capacity at a large discount and can be evicted",
      wrong: [
        "Reserved instances, which guarantee capacity for the full term",
        "Pay-as-you-go provisioned capacity with no interruption risk",
        "A free grant that requires no payment at all",
      ],
      rationale: "Spot pricing draws on spare provider capacity and offers the steepest discount, at the cost of possible eviction. That suits interruptible, retryable batch work and is wrong for anything that must run continuously.",
      keyPoints: [
        "Spot uses spare capacity, so the price is far below normal rates.",
        "Spot capacity can be evicted, so only interruptible work should use it.",
        "Reserved and pay-as-you-go capacity are not discounted in the same way.",
      ],
      whyOthers: [
        "Reserved instances do not offer spot-level discounts; they trade flexibility for a smaller saving.",
        "Pay-as-you-go provisioned capacity is billed at standard rates with no eviction.",
        "Free grants are limited promotional credits, not a general pricing model.",
      ],
      difficulty: "medium",
      topic: "Cloud pricing models",
    },
    {
      question: "Which statement correctly compares Azure Hybrid Benefit with other pricing models?",
      correct: "It lets an organization apply its existing on-premises Windows Server or SQL Server licenses to eligible Azure virtual machines instead of paying full price",
      wrong: [
        "It is a free tier that gives every new customer free compute for a year",
        "It is a spot pricing option that uses spare Azure capacity",
        "It is a subscription discount that applies only to Azure Cosmos DB",
      ],
      rationale: "Azure Hybrid Benefit is an A licensing benefit: eligible on-premises licenses let you bring existing entitlement to Azure virtual machines, reducing cost. It is distinct from spot pricing, free tiers, and service-specific discounts.",
      keyPoints: [
        "Hybrid Benefit applies existing licenses to Azure virtual machines.",
        "It reduces the effective compute cost without changing the workload.",
        "It is unrelated to spot capacity, free grants, or individual service discounts.",
      ],
      whyOthers: [
        "Hybrid Benefit depends on existing licenses, not on a promotional free period.",
        "Spot pricing is a capacity model; Hybrid Benefit is a licensing benefit.",
        "Hybrid Benefit applies to eligible virtual machine workloads, not to Cosmos DB.",
      ],
      difficulty: "medium",
      topic: "Cloud pricing models",
    },
  ],

  serverless: [
    {
      question: "What defines a serverless computing service?",
      correct: "The provider manages the servers, so the customer only writes and deploys code",
      wrong: [
        "The service runs without any servers or physical infrastructure anywhere",
        "The customer manages servers but pays nothing for them",
        "The service runs only on physical servers located at the customer site",
      ],
      rationale: "Serverless means the customer does not manage infrastructure. Servers still exist - they are abstracted and operated by the provider - and the customer is billed for the requests their code triggers.",
      keyPoints: [
        "Serverless abstracts server management, it does not remove servers.",
        "The customer provides code; the provider operates and scales the platform.",
        "Billing follows requests or executions rather than provisioned capacity.",
      ],
      whyOthers: [
        "Servers physically exist in the provider's datacenters; the abstraction is what is serverless.",
        "Serverless is metered, not free, and the customer still does not manage servers.",
        "Serverless platforms run in cloud datacenters, not on customer hardware.",
      ],
      difficulty: "easy",
      topic: "Serverless",
    },
    {
      question: "A team needs to process an image every time a blob is uploaded, without managing any servers. Which Azure service fits?",
      correct: "Azure Functions triggered by a blob-storage event",
      wrong: [
        "A virtual machine with a scheduled task polling the storage account",
        "A scale set of VMs running a web application that checks the queue",
        "An availability set of VMs with a file share for uploads",
      ],
      rationale: "An event-driven function reacting to a blob upload is the canonical serverless pattern: no servers to manage, scale to zero between events, billed per execution.",
      keyPoints: [
        "Event triggers connect storage events directly to function execution.",
        "No instance needs to run or poll continuously.",
        "Cost follows executions, so infrequent events cost little.",
      ],
      whyOthers: [
        "A polling task on a virtual machine requires managing servers, which is exactly what serverless removes.",
        "A scale set of VMs is managed compute, but it is not event-driven serverless execution.",
        "An availability set provides redundancy for VMs, not event-driven processing.",
      ],
      difficulty: "easy",
      topic: "Serverless",
    },
    {
      question: "Why can a serverless function be cheaper than a virtual machine for infrequent work?",
      correct: "It can scale to zero, so no capacity is billed during periods with no requests",
      wrong: [
        "Serverless services have no billing meter at all",
        "A virtual machine cannot be stopped when it is not needed",
        "Serverless always runs at a reserved capacity that costs less per hour",
      ],
      rationale: "The key economic property is scaling to zero. Between events no instances run and nothing is billed, whereas a virtual machine retains allocated capacity and bills for it.",
      keyPoints: [
        "Scale to zero is what makes sporadic workloads inexpensive.",
        "Virtual machines keep allocated capacity and are billed for it while stopped-but-allocated.",
        "Serverless is billed per execution, not per reserved instance.",
      ],
      whyOthers: [
        "Serverless services are metered per execution or request; there is always a meter.",
        "Virtual machines can be stopped or deallocated, but deallocation loses local state and IP by default.",
        "Serverless does not reserve capacity; it scales to zero instead.",
      ],
      difficulty: "medium",
      topic: "Serverless",
    },
    {
      question: "What is a realistic limitation of a serverless design compared with virtual machines?",
      correct: "Execution time, memory, and concurrency are capped, so long-running or resource-heavy work may not fit",
      wrong: [
        "Serverless functions cannot make outbound network calls",
        "Serverless code cannot use any external libraries",
        "Serverless services only run in one specific region worldwide",
      ],
      rationale: "Serverless platforms bound execution duration, memory, and concurrency per instance. Work that exceeds those limits, or needs very long processing, belongs on virtual machines. Network calls, libraries, and multi-region deployment are all supported.",
      keyPoints: [
        "Function plans impose time, memory, and concurrency limits.",
        "Long-running or heavy compute workloads belong on VMs or other managed compute.",
        "Outbound networking, external packages, and multi-region deployment are supported.",
      ],
      whyOthers: [
        "Serverless functions can call external endpoints over the network.",
        "Functions support external packages and bindings.",
        "Serverless services deploy to many regions.",
      ],
      difficulty: "medium",
      topic: "Serverless",
    },
  ],

  "availability-and-scalability-benefits": [
    {
      question: "What is the main availability benefit a customer gains from cloud services?",
      correct: "Access to redundant infrastructure and managed resilience features that reduce the impact of hardware and datacenter failures",
      wrong: [
        "A guarantee that no service interruption will ever occur",
        "The elimination of the need to design for failure",
        "Automatic recovery of every application without backups or configuration",
      ],
      rationale: "Cloud platforms provide redundancy, availability zones, and managed service resilience, which reduce the blast radius of failures. Availability is a design outcome rather than an absolute guarantee, and it still requires planning and backups.",
      keyPoints: [
        "Redundant infrastructure and zonal design reduce the blast radius of failures.",
        "Managed services remove much of the patching and failover work.",
        "High availability is designed and tested, not guaranteed by the provider alone.",
      ],
      whyOthers: [
        "No provider guarantees zero interruption; SLAs define service targets, not perfection.",
        "Designing for failure remains the customer's responsibility.",
        "Application recovery still depends on customer configuration and backups.",
      ],
      difficulty: "easy",
      topic: "Availability and scalability benefits",
    },
    {
      question: "What is the difference between scaling out and scaling up?",
      correct: "Scaling out adds more instances of the same size; scaling up makes an existing instance larger",
      wrong: [
        "Scaling out makes an instance larger; scaling up adds more instances",
        "Both terms describe moving a workload to a different region",
        "Scaling out changes the operating system; scaling up changes the network",
      ],
      rationale: "Horizontal scaling adds capacity by adding instances; vertical scaling increases the capacity of a single instance. Only horizontal scaling usually benefits from availability zones and autoscaling, and only vertical scaling requires a restart or resize of the existing instance.",
      keyPoints: [
        "Scale out (horizontal) adds instances; scale up (vertical) enlarges one instance.",
        "Scale out is what pairs with availability zones and autoscaling.",
        "Vertical scaling has a ceiling set by the largest available size.",
      ],
      whyOthers: [
        "The definitions are reversed in this option.",
        "Moving a workload to another region is relocation, not scaling.",
        "Scaling changes compute capacity, not operating system or network configuration.",
      ],
      difficulty: "easy",
      topic: "Availability and scalability benefits",
    },
    {
      question: "A web application experiences sharp traffic spikes during a promotion. Which Azure feature adds instances automatically when demand rises?",
      correct: "Autoscaling, typically configured on a VM scale set or App Service plan",
      wrong: [
        "A resource lock, which prevents deletion during peak load",
        "An availability zone, which distributes existing instances across facilities",
        "A management group, which inherits policy to child subscriptions",
      ],
      rationale: "Autoscaling adds or removes capacity according to a rule or metric such as CPU percentage. Zones distribute capacity that already exists; locks, policies, and management groups govern change and organization rather than adding compute.",
      keyPoints: [
        "Autoscaling reacts to a metric or schedule and adjusts instance count.",
        "Scale sets and App Service plans implement it with defined minimum and maximum counts.",
        "It must be designed with statelessness so new instances can serve requests.",
      ],
      whyOthers: [
        "A lock restricts deletion or modification; it adds no capacity.",
        "Availability zones distribute fixed capacity across facilities for resilience, not elasticity.",
        "Management groups apply governance to subscriptions and do not provision compute.",
      ],
      difficulty: "easy",
      topic: "Availability and scalability benefits",
    },
    {
      question: "Why is the ability to provision capacity in minutes instead of weeks a cloud benefit?",
      correct: "It shortens the time to respond to demand, because capacity is requested rather than procured and installed",
      wrong: [
        "It reduces the per-hour price of the provisioned capacity",
        "It removes the need to monitor the capacity once it exists",
        "It guarantees the new capacity performs better than existing capacity",
      ],
      rationale: "Elasticity's practical value is speed of response. Provisioning time drops from a procurement cycle to minutes. It does not itself lower unit price, remove monitoring needs, or improve performance quality.",
      keyPoints: [
        "On-demand provisioning removes the hardware procurement and installation cycle.",
        "Faster response means less time running under-provisioned during a spike.",
        "Speed to provision is distinct from unit price, monitoring, and performance tuning.",
      ],
      whyOthers: [
        "Provisioning speed is about time to capacity, not the price charged per unit.",
        "New capacity still needs monitoring and tuning.",
        "New capacity is not inherently faster; application design determines performance.",
      ],
      difficulty: "medium",
      topic: "Availability and scalability benefits",
    },
    {
      question: "A company must survive the failure of an entire datacenter within a region. Which Azure feature directly addresses this?",
      correct: "Deploying across availability zones within that region",
      wrong: [
        "Adding resource tags to the datacenter resources",
        "Creating additional resource groups in the same datacenter",
        "Applying a management group above the subscription",
      ],
      rationale: "Availability zones are physically separate, independently powered datacenter groupings inside a region, so a single-facility failure does not take down the application. Tags, resource groups, and management groups are organizational and have no effect on physical resilience.",
      keyPoints: [
        "Zones are separate facilities with independent power, cooling, and networking inside one region.",
        "The service must support zone-redundant deployment for the design to apply.",
        "Zonal deployment is the direct answer to a single-datacenter outage.",
      ],
      whyOthers: [
        "Tags are metadata with no infrastructure effect.",
        "Resource groups are logical containers; more of them in the same datacenter change nothing physically.",
        "Management groups organize subscriptions for governance, not hardware failure domains.",
      ],
      difficulty: "easy",
      topic: "Availability and scalability benefits",
    },
    {
      question: "Which design change makes horizontal autoscaling safe for a web application?",
      correct: "Making the application stateless, storing session state outside the instances",
      wrong: [
        "Storing session state on each instance's local disk",
        "Pinning users to a specific instance by source IP",
        "Using a single large instance so scaling is unnecessary",
      ],
      rationale: "Autoscaling adds and removes instances at any time, so per-instance session state would be lost or stranded. Externalizing session state makes any instance interchangeable, which is the precondition for safe scaling out.",
      keyPoints: [
        "Statelessness lets any instance serve any request.",
        "Session state belongs in an external store such as a cache or database.",
        "Sticky sessions limit effective scale and reduce resilience.",
      ],
      whyOthers: [
        "Local disk session state is lost when the instance is removed or replaced.",
        "IP pinning prevents load balancing from distributing requests freely and keeps users on a single point of failure.",
        "Using one large instance avoids scaling rather than enabling safe autoscaling.",
      ],
      difficulty: "medium",
      topic: "Availability and scalability benefits",
    },
    {
      question: "A customer's monthly compute bill varies widely because a scale set scales up during the day and down at night. What should the customer do first?",
      correct: "Check whether the scaling rule and minimum instance count match the real traffic pattern",
      wrong: [
        "Move all workloads to a reserved instance regardless of usage",
        "Disable autoscaling so the bill stops varying",
        "Add more resource tags so costs can be grouped",
      ],
      rationale: "Unexpected cost variation usually means the scaling configuration does not match the workload. Reviewing the rule, cooldown, and minimum count addresses the cause. Tags only attribute cost after the fact, and disabling or reserving capacity treats the symptom.",
      keyPoints: [
        "Cost reflects the scaling rule, cooldown, and minimum instance count.",
        "Over-aggressive rules scale faster than real demand requires.",
        "Attribution and commitments are secondary to correcting the rule.",
      ],
      whyOthers: [
        "A reservation made before understanding the pattern risks paying for unused capacity.",
        "Disabling autoscaling sacrifices the availability benefit to fix the symptom.",
        "Tags organize and allocate cost but do not reduce it.",
      ],
      difficulty: "medium",
      topic: "Availability and scalability benefits",
    },
  ],

  "reliability-and-predictability-benefits": [
    {
      question: "What does reliability mean in the context of cloud benefits?",
      correct: "A workload keeps operating as intended despite component failures, through redundancy and resilient design",
      wrong: [
        "A guarantee that a service will never have an outage",
        "The property of always using the fastest available option",
        "The ability to predict monthly cost with complete accuracy",
      ],
      rationale: "Reliability is the ability to keep a service available and consistent through failures. It is achieved with redundancy, health monitoring, and recovery design, not promised as an absence of incidents.",
      keyPoints: [
        "Reliability is designed through redundancy and recovery, not guaranteed by the provider.",
        "It is a resilience property, distinct from performance speed and cost predictability.",
        "Measuring reliability over time is what makes improvement possible.",
      ],
      whyOthers: [
        "Providers publish SLAs, not absolute guarantees of never failing.",
        "Speed is a performance concern, not reliability.",
        "Cost predictability is a separate benefit measured by billing tooling.",
      ],
      difficulty: "easy",
      topic: "Reliability and predictability benefits",
    },
    {
      question: "Which Azure features most directly support high availability for a business-critical application?",
      correct: "Availability zones, load balancing, and zone-redundant managed services",
      wrong: [
        "Resource tags, cost budgets, and the pricing calculator",
        "A single large virtual machine with no redundancy",
        "Local SSD caching with a single availability set",
      ],
      rationale: "Availability comes from removing single points of failure: distributing across zones, balancing traffic, and using managed services that are themselves zone-redundant. Organizational features and single-instance designs do not provide resilience.",
      keyPoints: [
        "High availability requires eliminating single points of failure.",
        "Zones, load balancing, and zone-redundant services are the building blocks.",
        "A single large VM is a bigger single point of failure, not a resilience feature.",
      ],
      whyOthers: [
        "Tags, budgets, and the calculator are management and cost features with no availability effect.",
        "One large instance is a single point of failure.",
        "A single availability set places instances in one datacenter, so it does not survive a facility outage.",
      ],
      difficulty: "easy",
      topic: "Reliability and predictability benefits",
    },
    {
      question: "A platform team wants evidence that a service meets its reliability target. What should they use?",
      correct: "Azure Monitor metrics and alerts against the service's availability target, reviewed over time",
      wrong: [
        "The Azure pricing calculator, which reports historical uptime",
        "Resource tags, which record the agreed target",
        "A resource lock, which enforces the target",
      ],
      rationale: "Reliability targets are verified with monitoring: metrics, logs, and alerts measure actual behavior against the objective. The pricing calculator estimates future cost, tags label resources, and locks prevent changes; none of them produce evidence of reliability.",
      keyPoints: [
        "Azure Monitor collects metrics and logs that measure real availability.",
        "Alerts convert a measurement into action when the objective is at risk.",
        "Objectives are verified with evidence, not with configuration records.",
      ],
      whyOthers: [
        "The pricing calculator estimates cost before deployment and has no uptime data.",
        "Tags are metadata; they do not measure anything.",
        "A lock prevents modification or deletion; it does not measure reliability.",
      ],
      difficulty: "easy",
      topic: "Reliability and predictability benefits",
    },
    {
      question: "How does an SLA support predictability for a business workload?",
      correct: "It documents a service commitment the customer can use to plan for the expected level of availability",
      wrong: [
        "It guarantees the customer's application will have no bugs",
        "It removes the customer's need to design for failure",
        "It fixes the customer's monthly Azure bill",
      ],
      rationale: "A service-level agreement sets an availability commitment that supports capacity and risk planning. It does not cover application defects, replace resilient design, or control cost.",
      keyPoints: [
        "An SLA is a documented service availability commitment.",
        "SLAs feed into risk and capacity planning for dependent workloads.",
        "Application quality and cost remain the customer's responsibility.",
      ],
      whyOthers: [
        "SLAs cover provider service availability, not application defects.",
        "Resilient design is still the customer's responsibility under an SLA.",
        "Cost is governed by usage and pricing, not by an SLA.",
      ],
      difficulty: "medium",
      topic: "Reliability and predictability benefits",
    },
  ],

  "security-and-governance-benefits": [
    {
      question: "Which security responsibility belongs to the cloud provider?",
      correct: "Security of the physical datacenters, hosts, and virtualization layer",
      wrong: [
        "Patching the operating system of a customer's virtual machine",
        "Classifying the sensitivity of the customer's data",
        "Managing the customer's user accounts and access permissions",
      ],
      rationale: "The provider secures the infrastructure beneath the customer's workloads. The customer secures the operating system, applications, identities, and data it deploys.",
      keyPoints: [
        "The provider owns physical and virtual layer security.",
        "The customer owns the guest OS, data, identities, and access configuration.",
        "The boundary moves with the service model but never disappears.",
      ],
      whyOthers: [
        "Guest OS patching is a customer responsibility for IaaS.",
        "Data classification is a business decision made by the customer.",
        "Managing users and access in Microsoft Entra is a customer responsibility.",
      ],
      difficulty: "easy",
      topic: "Security and governance benefits",
    },
    {
      question: "A company must prove to auditors that only approved regions are used for new deployments. Which Azure service enforces this?",
      correct: "Azure Policy, with a location restriction policy assigned at the appropriate scope",
      wrong: [
        "Microsoft Purview, which discovers and classifies data assets",
        "Azure Advisor, which recommends configuration improvements",
        "Azure Service Health, which reports platform incidents",
      ],
      rationale: "Azure Policy evaluates resource configurations against organizational rules and can deny or audit deployments. Purview addresses data governance, Advisor gives recommendations, and Service Health reports platform events.",
      keyPoints: [
        "Azure Policy can deny non-compliant deployments at the point of creation.",
        "Scope determines where the rule applies; a management group can cover many subscriptions.",
        "The other services do different jobs: data governance, recommendations, and platform status.",
      ],
      whyOthers: [
        "Purview classifies and governs data, not resource location rules.",
        "Advisor recommends improvements but does not block deployments.",
        "Service Health reports incidents affecting Azure, not configuration compliance.",
      ],
      difficulty: "easy",
      topic: "Security and governance benefits",
    },
    {
      question: "What security benefit does a customer gain by adopting Microsoft Entra ID for its Azure workloads?",
      correct: "A single cloud identity provider that centralizes authentication, conditional access, and federation with on-premises directories",
      wrong: [
        "Physical security of the Azure datacenters hosting the workloads",
        "Automatic patching of the guest operating systems it manages",
        "Offline encryption of every customer's data at rest",
      ],
      rationale: "Microsoft Entra ID provides cloud identity: single sign-on, multifactor authentication, Conditional Access, and federation with on-premises Active Directory. Datacenter security and guest OS patching stay with the provider and the customer respectively.",
      keyPoints: [
        "Entra ID is the cloud identity and access control plane for Azure and Microsoft services.",
        "It federates with on-premises Active Directory so identities work in both places.",
        "Conditional Access applies policy using identity, device, location, and risk signals.",
      ],
      whyOthers: [
        "Physical datacenter security is a provider responsibility unrelated to identity.",
        "Entra ID manages identities, not guest operating system patching.",
        "Data encryption at rest is a storage and platform capability, not an identity benefit.",
      ],
      difficulty: "easy",
      topic: "Security and governance benefits",
    },
    {
      question: "Which capability best illustrates the defense in depth strategy in Azure?",
      correct: "Combining network segmentation, identity controls, encryption, and monitoring so no single failure exposes the workload",
      wrong: [
        "Relying on a single firewall at the network perimeter",
        "Relying only on multifactor authentication and skipping network controls",
        "Relying on a single administrator account to keep the environment secure",
      ],
      rationale: "Defense in depth layers independent controls so the compromise of one layer does not expose the workload. Relying on a single control of any type removes that independence.",
      keyPoints: [
        "Layers must be independent so one failure does not remove all protection.",
        "Typical layers are identity, network, compute, application, and data.",
        "Each layer alone leaves a gap; the value comes from the combination.",
      ],
      whyOthers: [
        "A perimeter firewall alone is the classic single control that defense in depth replaces.",
        "Skipping network controls leaves a gap even with strong MFA.",
        "A single administrator account is a concentration of risk, not a layer.",
      ],
      difficulty: "medium",
      topic: "Security and governance benefits",
    },
  ],

  "manageability-benefits": [
    {
      question: "Which tools let an organization manage Azure resources consistently across hundreds of subscriptions?",
      correct: "The Azure portal, Azure CLI, Azure PowerShell, and Azure Resource Manager templates",
      wrong: [
        "Only the Azure portal, because scripting is not supported",
        "Only local PowerShell on an administrator's laptop",
        "Only the Azure pricing calculator and cost budgets",
      ],
      rationale: "Azure exposes the same control plane through the portal, CLI, PowerShell, and declarative templates, so administration can be scripted, automated, and repeated rather than performed click by click.",
      keyPoints: [
        "Portal, CLI, PowerShell, and templates all drive Azure Resource Manager.",
        "Scriptable interfaces make large-scale, repeatable administration practical.",
        "Consistency comes from automation, not from manual repetition in the portal.",
      ],
      whyOthers: [
        "Azure supports scripting through the CLI and PowerShell.",
        "Administration is not limited to one local machine; Cloud Shell and CI run the same tooling.",
        "The pricing calculator and budgets manage cost, not resources.",
      ],
      difficulty: "easy",
      topic: "Manageability benefits",
    },
    {
      question: "What is a key manageability benefit of deploying resources from an ARM template?",
      correct: "The same reviewed configuration can be deployed repeatedly and consistently across environments",
      wrong: [
        "Templates guarantee that deployments always succeed without testing",
        "Templates automatically apply the lowest cost to every resource",
        "Templates remove the need to define any parameters",
      ],
      rationale: "Declarative templates make infrastructure repeatable and reviewable, so environments can be built consistently from the same source. They do not guarantee success, optimize cost automatically, or eliminate parameters.",
      keyPoints: [
        "Templates turn infrastructure into reviewable, versionable source.",
        "One template can produce consistent dev, test, and prod environments.",
        "Templates support parameters and dependencies rather than removing configuration.",
      ],
      whyOthers: [
        "Templates can fail; validation and testing are still required.",
        "Cost depends on the resources and SKUs chosen, not on using a template.",
        "Parameters are a core feature that let one template serve multiple environments.",
      ],
      difficulty: "easy",
      topic: "Manageability benefits",
    },
    {
      question: "How does Azure Policy support manageability at scale?",
      correct: "It can audit or deny resources across a whole management group, so standards are enforced without visiting each subscription",
      wrong: [
        "It speeds up virtual machine boot times",
        "It automatically reduces the cost of every resource",
        "It provides remote desktop access to virtual machines",
      ],
      rationale: "Policy assigned at a high scope inherits downward and evaluates resources automatically, which makes governance manageable across many subscriptions without manual inspection.",
      keyPoints: [
        "Policy assignments inherit from parent scopes such as management groups.",
        "Effects can audit, deny, modify, or remediate.",
        "Governance at scale comes from automatic evaluation, not manual review.",
      ],
      whyOthers: [
        "Policy governs configuration compliance; it does not affect boot performance.",
        "Cost optimization is addressed by cost management and Advisor, not Policy.",
        "Remote access is provided by tools such as Bastion or Virtual Desktop, not Policy.",
      ],
      difficulty: "easy",
      topic: "Manageability benefits",
    },
    {
      question: "Why is automation considered a manageability benefit of cloud computing?",
      correct: "Because the same administrative tasks can be defined once and executed repeatedly and consistently without manual effort each time",
      wrong: [
        "Because automation removes the need for monitoring after deployment",
        "Because automated deployments always use the cheapest possible resources",
        "Because manual administration is no longer permitted in Azure",
      ],
      rationale: "Automation replaces repeated manual administration with a repeatable definition, which improves consistency and reduces effort. It does not remove monitoring, guarantee lowest cost, or prohibit manual use.",
      keyPoints: [
        "Automation captures administration once as code or a pipeline.",
        "Repeated execution gives consistent results across environments and teams.",
        "Monitoring, cost tuning, and human judgment remain necessary.",
      ],
      whyOthers: [
        "Automation still requires monitoring to confirm the deployed configuration behaves as intended.",
        "Automated deployments cost exactly what their resources cost; automation does not minimize spend.",
        "Manual administration remains available; automation is an option, not a restriction.",
      ],
      difficulty: "medium",
      topic: "Manageability benefits",
    },
  ],

  "describe-iaas": [
    {
      question: "In an IaaS deployment on Azure, which component does the customer administer?",
      correct: "The guest operating system, its configuration, and the applications running on it",
      wrong: [
        "The physical servers and racks in the datacenter",
        "The hypervisor and host operating system layer",
        "The datacenter power and cooling systems",
      ],
      rationale: "IaaS hands the customer a virtual machine and leaves the guest OS, patching, and applications to them. Everything below the guest - hardware, virtualization, and datacenter - belongs to the provider.",
      keyPoints: [
        "IaaS gives full control of the guest OS and the customer's software.",
        "The customer patches the guest OS and manages its configuration.",
        "The provider manages hardware, hypervisor, and datacenter operations.",
      ],
      whyOthers: [
        "Physical servers and racks are the provider's infrastructure.",
        "The hypervisor and host layer are managed by Microsoft in Azure.",
        "Power and cooling are datacenter operations handled by the provider.",
      ],
      difficulty: "easy",
      topic: "IaaS",
    },
    {
      question: "Which workload is the best fit for IaaS rather than PaaS?",
      correct: "A legacy application that requires a specific operating system and kernel-level configuration",
      wrong: [
        "A static marketing website served by a managed web app",
        "A queue-processing function that runs only when a message arrives",
        "A hosted database engine managed by the provider",
      ],
      rationale: "IaaS suits workloads that need control over the operating system or kernel. Managed web hosting, event-driven functions, and managed databases are all PaaS where that control is unnecessary.",
      keyPoints: [
        "IaaS is the right choice when OS-level control is genuinely required.",
        "PaaS removes the need to manage the guest OS.",
        "Choosing IaaS without a control requirement adds cost and patching work for no benefit.",
      ],
      whyOthers: [
        "A managed web app is a PaaS hosting option.",
        "Event-driven processing is a natural fit for serverless or managed compute, not manual VMs.",
        "A managed database is a PaaS service.",
      ],
      difficulty: "easy",
      topic: "IaaS",
    },
    {
      question: "What operational work does a customer take on when moving a workload from PaaS to IaaS?",
      correct: "Guest OS patching, capacity planning, and monitoring of the instances it now manages itself",
      wrong: [
        "Less work, because the customer now controls the configuration directly",
        "No additional work, because Azure manages the guest OS regardless of service type",
        "Only application code development, with infrastructure handled by the provider",
      ],
      rationale: "Moving from PaaS to IaaS increases customer responsibility: the guest OS, its updates, and the instances themselves become the customer's to run. Control is real, but so is the work.",
      keyPoints: [
        "More control means more responsibility, particularly for the guest OS.",
        "Patching, scaling, and monitoring the OS become customer tasks.",
        "The provider still owns the layer below the guest.",
      ],
      whyOthers: [
        "Direct control does not reduce operational work; it increases it.",
        "In IaaS the customer, not Azure, manages the guest operating system.",
        "Infrastructure is exactly what the customer takes on in IaaS.",
      ],
      difficulty: "medium",
      topic: "IaaS",
    },
    {
      question: "A company runs a database on an Azure virtual machine. Which statement about responsibility is correct?",
      correct: "Microsoft secures the host and hypervisor; the customer secures the guest OS, the database engine, and the data",
      wrong: [
        "Microsoft secures the guest operating system because the database runs on Azure",
        "The customer is responsible only for the data, not the guest OS or database engine",
        "Responsibility is shared equally for every layer of the stack",
      ],
      rationale: "For a database on a virtual machine, the division follows the service model: Microsoft owns the infrastructure below the guest, and the customer owns the guest OS, the database engine configuration, and the data it stores.",
      keyPoints: [
        "Database servers on VMs follow IaaS responsibility boundaries.",
        "The customer patches the guest OS and secures the database engine.",
        "Microsoft's responsibility does not extend into the customer's guest OS.",
      ],
      whyOthers: [
        "Microsoft does not patch or secure operating systems running as customer workloads.",
        "Securing the guest OS and database engine is part of the customer's IaaS responsibility.",
        "Responsibility is divided by layer, not shared equally everywhere.",
      ],
      difficulty: "medium",
      topic: "IaaS",
    },
  ],

  "describe-paas": [
    {
      question: "In a PaaS deployment, which parts of the stack does the provider operate?",
      correct: "The infrastructure, the operating system, and the application runtime, leaving the customer responsible for the application and its data",
      wrong: [
        "Only the hardware; the customer operates the operating system and runtime",
        "Everything including the application code and business data",
        "Only the runtime; the customer operates the hardware and operating system",
      ],
      rationale: "PaaS removes the operating system and runtime from the customer's responsibility. The customer supplies the application code and data and manages them; the provider runs the platform beneath.",
      keyPoints: [
        "PaaS abstracts the OS and runtime, which the provider operates.",
        "The customer owns the application code and data.",
        "PaaS reduces operational work while keeping control of the application itself.",
      ],
      whyOthers: [
        "That describes IaaS, where the customer manages the guest OS.",
        "Managing the application itself is what distinguishes SaaS from PaaS.",
        "In PaaS the provider operates the infrastructure and runtime, not the customer.",
      ],
      difficulty: "easy",
      topic: "PaaS",
    },
    {
      question: "A developer wants to deploy a web application without managing a server operating system. Which service type is appropriate?",
      correct: "PaaS",
      wrong: ["IaaS", "SaaS", "A physical datacenter"],
      rationale: "Deploying code to a managed platform without operating the OS is the definition of PaaS, and Azure App Service is a typical example.",
      keyPoints: [
        "PaaS hosts customer code on a managed platform.",
        "The customer does not patch the operating system or web server.",
        "App Service is the canonical Azure PaaS web hosting option.",
      ],
      whyOthers: [
        "IaaS requires the customer to operate the guest OS.",
        "SaaS means the provider operates the application itself, which is not what the developer has.",
        "A physical datacenter is on-premises infrastructure, not a cloud service type.",
      ],
      difficulty: "easy",
      topic: "PaaS",
    },
    {
      question: "How does PaaS differ from IaaS in terms of customer responsibility?",
      correct: "PaaS shifts operating system and runtime management to the provider, reducing customer administrative work",
      wrong: [
        "PaaS increases customer responsibility because the platform is more complex",
        "Both models place identical responsibility on the customer",
        "PaaS removes the customer's responsibility for the application code",
      ],
      rationale: "The value of PaaS is administrative reduction: the provider operates the OS and runtime. Responsibility for the customer's own code and data remains.",
      keyPoints: [
        "PaaS reduces OS and runtime administration.",
        "Application code and data stay the customer's responsibility.",
        "The customer trades infrastructure control for less operational work.",
      ],
      whyOthers: [
        "PaaS is simpler for the customer, not more complex.",
        "The models differ precisely in how responsibility is divided.",
        "Application code remains the customer's responsibility in PaaS.",
      ],
      difficulty: "easy",
      topic: "PaaS",
    },
    {
      question: "Which is a PaaS service in Azure?",
      correct: "Azure App Service",
      wrong: ["Azure Virtual Machines", "Azure Virtual Network", "Azure Storage"],
      rationale: "App Service hosts web applications on a managed runtime, so it is a platform service. Virtual machines and virtual networks are IaaS, and Storage is a storage service rather than a hosting platform.",
      keyPoints: [
        "App Service provides managed hosting for web applications.",
        "Virtual machines expose a guest OS the customer manages, which is IaaS.",
        "Storage provides data services rather than an application platform.",
      ],
      whyOthers: [
        "Azure Virtual Machines is IaaS: the customer operates the guest OS.",
        "Azure Virtual Network is a networking foundation, not a hosting platform.",
        "Azure Storage stores and serves data; it does not host the customer's application runtime.",
      ],
      difficulty: "easy",
      topic: "PaaS",
    },
  ],

  "describe-saas": [
    {
      question: "In a SaaS model, who operates the application the customer uses?",
      correct: "The cloud provider operates the application, its infrastructure, and its updates",
      wrong: [
        "The customer operates the application on its own virtual machines",
        "The customer and provider share operation of the application equally",
        "The customer operates only the application while the provider runs the hardware",
      ],
      rationale: "SaaS is the most abstracted model: the provider runs the whole stack including the application. The customer configures, uses, and governs access to it.",
      keyPoints: [
        "The provider operates the application, runtime, and infrastructure.",
        "The customer is responsible for configuration, users, and data use.",
        "SaaS removes both infrastructure and application operation from the customer.",
      ],
      whyOthers: [
        "Running the application on customer VMs describes PaaS or IaaS, not SaaS.",
        "SaaS operation is not shared; the provider runs the application.",
        "Splitting application and hardware operation describes PaaS, not SaaS.",
      ],
      difficulty: "easy",
      topic: "SaaS",
    },
    {
      question: "Which statement about SaaS is accurate?",
      correct: "The provider handles patching, hosting, and availability of the application, while the customer governs users, access, and data",
      wrong: [
        "The customer must patch the SaaS application whenever a fix is released",
        "The customer cannot configure users or permissions in a SaaS application",
        "The customer owns the hardware that runs the SaaS application",
      ],
      rationale: "SaaS providers release and patch the application centrally. Customers configure the application for their organization and control who has access, but they do not patch it or own its infrastructure.",
      keyPoints: [
        "Provider-side patching and hosting are part of the SaaS model.",
        "Customers configure tenancy, users, and permissions.",
        "Hardware ownership stays with the provider.",
      ],
      whyOthers: [
        "SaaS providers patch the application centrally; customers cannot patch it.",
        "Configuring users and permissions is a normal customer responsibility in SaaS.",
        "The provider owns the hardware; that is the basis of the service.",
      ],
      difficulty: "easy",
      topic: "SaaS",
    },
    {
      question: "A company wants to use a vendor's email service without installing or maintaining anything. Which service model is this?",
      correct: "SaaS",
      wrong: ["IaaS", "PaaS", "A private cloud it manages itself"],
      rationale: "Using a vendor's application over the network with nothing to install is the definition of SaaS.",
      keyPoints: [
        "No installation or maintenance by the customer indicates SaaS.",
        "Hosted email is a typical SaaS example.",
        "IaaS and PaaS both leave the customer running something.",
      ],
      whyOthers: [
        "IaaS requires the customer to manage virtual machines and their OS.",
        "PaaS requires the customer to deploy and configure its own application code.",
        "A self-managed private cloud is owned and operated by the company, not delivered by a vendor.",
      ],
      difficulty: "easy",
      topic: "SaaS",
    },
    {
      question: "Which responsibility remains with the customer when using SaaS?",
      correct: "Governing access to the application and classifying the data stored in it",
      wrong: [
        "Patching the SaaS application's servers",
        "Securing the datacenters that host the SaaS application",
        "Upgrading the hypervisor running the SaaS tenant",
      ],
      rationale: "Even in SaaS the customer governs identity, access, and data classification. Everything from the datacenter up is the provider's responsibility.",
      keyPoints: [
        "Access governance and data classification are customer duties in SaaS.",
        "Patching, datacenters, and virtualization belong to the provider.",
        "The shared responsibility boundary narrows but never vanishes.",
      ],
      whyOthers: [
        "Application and infrastructure patching are provider responsibilities in SaaS.",
        "Datacenter security is always a provider responsibility.",
        "The hypervisor is provider-managed.",
      ],
      difficulty: "medium",
      topic: "SaaS",
    },
  ],

  "service-type-use-cases": [
    {
      question: "A team must choose a service type for a workload. What is the correct decision rule?",
      correct: "Choose the least operational responsibility that still gives the control and customization the workload genuinely requires",
      wrong: [
        "Always choose IaaS because it offers the most features",
        "Always choose SaaS because it is the cheapest to start",
        "Choose based on which service type the team has used before",
      ],
      rationale: "The right choice balances required control against administrative burden. IaaS maximizes control and responsibility, SaaS minimizes both, and PaaS sits between them. Familiarity is not a technical criterion.",
      keyPoints: [
        "Service type choice is about matching control needs to administrative capacity.",
        "Over-provisioning control adds patching and operational cost without benefit.",
        "Under-provisioning control can block requirements such as custom OS configuration.",
      ],
      whyOthers: [
        "IaaS is not automatically the most capable or appropriate; it carries the most responsibility.",
        "SaaS is cheap to start but cannot satisfy workloads needing OS-level control.",
        "Prior experience does not determine technical fit.",
      ],
      difficulty: "easy",
      topic: "Service type use cases",
    },
    {
      question: "Which workload most strongly calls for IaaS?",
      correct: "A specialized application that requires a particular operating system version and low-level network configuration",
      wrong: [
        "A standard internal reporting website that a team wants to launch quickly",
        "A company's email and calendar service",
        "A scheduled data processing job triggered by file uploads",
      ],
      rationale: "The requirement for a specific OS and low-level network configuration is exactly what PaaS and SaaS remove. The reporting site, corporate email, and event-triggered job are all well served by managed services.",
      keyPoints: [
        "OS-level and network-level requirements are the IaaS decision trigger.",
        "Standard web hosting is a PaaS strength.",
        "Corporate email is the classic SaaS example.",
      ],
      whyOthers: [
        "A standard website is well served by App Service or similar PaaS hosting.",
        "Corporate email and calendar are delivered as SaaS.",
        "Event-triggered processing suits Functions or managed compute.",
      ],
      difficulty: "easy",
      topic: "Service type use cases",
    },
    {
      question: "A startup wants to validate an idea with a working product, minimizing both cost and operational effort. Which service type is most appropriate?",
      correct: "PaaS or SaaS, depending on whether the startup owns the code",
      wrong: [
        "IaaS, because manual control reduces cost during validation",
        "IaaS, because virtual machines are always the cheapest option",
        "A private cloud built for the startup",
      ],
      rationale: "Validation favours managed services that reduce both cost and effort. PaaS suits a startup that owns its code; SaaS suits a startup that consumes someone else's application.",
      keyPoints: [
        "Validation phases reward low operational effort and low fixed cost.",
        "PaaS keeps code ownership while removing infrastructure work.",
        "IaaS adds cost and responsibility that a validation phase rarely justifies.",
      ],
      whyOthers: [
        "Manual VM control increases both cost and effort rather than reducing them.",
        "Virtual machines are typically more expensive than managed services for the same job.",
        "Building a private cloud is a large infrastructure commitment, disproportionate to validation.",
      ],
      difficulty: "medium",
      topic: "Service type use cases",
    },
    {
      question: "A company already operates a VMware cluster on-premises and wants to move to Azure with minimal redesign. Which approach fits?",
      correct: "IaaS or Azure Arc, keeping the existing virtualization model and extending Azure management",
      wrong: [
        "Refactor the application into serverless functions",
        "Replace all applications with SaaS equivalents",
        "Rebuild the platform as a managed container service",
      ],
      rationale: "Minimizing redesign favors retaining the current virtualization model. IaaS provides Azure virtual machines; Azure Arc extends Azure management and governance to on-premises servers without moving them.",
      keyPoints: [
        "Minimal redesign favors infrastructure-preserving options.",
        "IaaS matches the existing VM-centric operating model.",
        "Azure Arc brings Azure governance to existing on-premises resources.",
      ],
      whyOthers: [
        "Refactoring to serverless is a substantial redesign, the opposite of minimal change.",
        "Replacing applications with SaaS products changes the business function entirely.",
        "Moving to managed containers requires application re-architecture.",
      ],
      difficulty: "medium",
      topic: "Service type use cases",
    },
  ],
};