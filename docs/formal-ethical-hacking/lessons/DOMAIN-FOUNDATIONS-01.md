# DOMAIN-F1 — Directory identities, objects and delegated authority

Draft K11 supporting teaching, not a canonical lesson or approved domain lab. Read Windows foundation identity/ACL concepts, EH-WEB-03 authentication-versus-authorisation and networking/DNS concepts first. Paper study requires no domain account or directory query. Continue with [the Kerberos flow](KERBEROS-FOUNDATIONS-02.md) and [capstone](DOMAIN-FOUNDATIONS-CAPSTONE.md). These local labels do not change the prerequisite graph.

## Model the directory
AD DS is a directory service with structured object data, a schema, search and replication mechanisms. Users, groups and computers are different object kinds; a computer identity is not merely a hostname string. A service may run under an identity whose permissions differ from the person using its application. Name the actor and the object before drawing a permission edge.

The logical model includes forests, domains and organisational units. A forest contains one or more domains sharing forest-level structure such as schema/configuration and global-catalogue facilities. A domain is a partition within that logical organisation. An OU groups objects for administration, policy and delegation; it is not a security group, a separate operating system or proof of network isolation. A diagram of containers is not automatically a diagram of authority.

Groups can be used in resource/object permission decisions. Membership, object scope, requested operation, applicable rights, inheritance and execution context need interpretation together. Do not substitute a familiar group name for a complete effective-rights decision, or assume that directory visibility grants permission to modify an object.

## Delegation is scoped
Administrative delegation can permit selected tasks on selected object/container scopes. Resetting training-user passwords is a different right from changing another group's membership, controlling a service account or administering an entire forest. A simplified edge should therefore read subject → permitted operation → object/scope, with its evidence and exclusions, rather than subject → all control. Inherited permissions require review, not an assumption that every descendant or protected object behaves identically.

FICTIONAL example: Helpdesk may perform a selected reset task in TrainingUsers. That does not establish control over an excluded operator object elsewhere. To extend the conclusion, identify the actual applicable permission path and its constraints. The case supplies no real directory or permission evidence.

## Connect identity to a service
Domain controllers provide directory/security services; Windows integrates its Kerberos KDC with domain-controller services and the AD DS account database. These roles explain a trust dependency, not a general access grant. A service still needs its resource/operation authorisation. Cross-system trust and delegation must be understood specifically; a trust relationship is not shorthand for universal administrative authority. Cloud identity/hybrid designs need separate treatment rather than treating every directory as interchangeable.

## Work and review
Draw an invented forest/domain/OU/group/user/computer/service map. Add three precise delegated-task edges and one excluded object. Mark which facts are given, inferred or missing. Explain why finding a principal differs from authenticating it, and why authenticating it differs from permission to read/update an object. Use D01/D02 in the [fictional cases](../fixtures/domain-foundations/cases.json).

No installation, domain join, account creation/reset, group change, permission change, trust configuration, directory enumeration or network operation is introduced. Existing workgroup Windows and foundation-network scopes remain unchanged. Real lab provisioning/licensing/isolation/support/private evidence routes require separate review. See [instructor guidance](DOMAIN-FOUNDATIONS-INSTRUCTOR.md).

Sources: https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview and https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/understanding-the-active-directory-logical-model and https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/delegating-administration-by-using-ou-objects .
