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

## Keep names, containers and authority distinct
| Item | What to put in the paper model | What not to infer |
|---|---|---|
| User principal | The participating identity named by the scenario | Rights over every object after sign-in |
| Computer object | A directory identity representing a computer | Proof of the current host's configuration or physical identity |
| Security group | Membership relevant to an applicable permission decision | Universal administrator authority from a familiar group label |
| OU | A container used for administration, delegation and policy organization | Security-group membership merely from location in the container |
| Service account | The identity used by a particular service deployment | The interactive user's identity or every service on the host |
| Resource operation | A specific read, update or delegated task on a named scope | Every other operation on that resource |

Use role labels such as learner, Helpdesk, training user and report service in the diagram, not real account names. Draw containment separately from membership and permission edges. Being inside a container, belonging to a group and possessing an applicable right are distinct statements. A redrawn diagram must not silently turn one into another.

A useful fictional delegation record names subject, requested task, object scope, exclusions, applicable permission evidence and observation status. For example, a supplied reset permission over training-user objects does not by itself cover group-membership edits, a different container or a service-account change. This is reasoning about supplied facts, not instructions to test those changes.

## Understand a service principal name without querying one
In Windows Kerberos, an SPN identifies a service instance and associates it with the account used for that service's sign-in. The service name, its account and its network address answer related but different questions. A hostname resolving successfully does not establish a correct SPN mapping, possession of the right key, service acceptance or application permission.

The application may need to request the intended service identity without knowing the underlying account name. That is why a service-identity mapping matters in the Kerberos flow. This lesson supplies no real SPN, command, directory search or registration procedure. Treat aliases and changes as design questions for an approved lab, not permission to modify production identity data.

Documentation for this addition: https://learn.microsoft.com/en-us/windows/win32/ad/service-principal-names and https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/delegation-control-wizard . Documentation explains the mechanism, not a reviewed course lab.

## Work and review
Draw an invented forest/domain/OU/group/user/computer/service map. Add three precise delegated-task edges and one excluded object. Mark which facts are given, inferred or missing. Explain why finding a principal differs from authenticating it, and why authenticating it differs from permission to read/update an object. Use D01/D02 in the [fictional cases](../fixtures/domain-foundations/cases.json).

No installation, domain join, account creation/reset, group change, permission change, trust configuration, directory enumeration or network operation is introduced. Existing workgroup Windows and foundation-network scopes remain unchanged. Real lab provisioning/licensing/isolation/support/private evidence routes require separate review. See [instructor guidance](DOMAIN-FOUNDATIONS-INSTRUCTOR.md).

Sources: https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview and https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/understanding-the-active-directory-logical-model and https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/delegating-administration-by-using-ou-objects .
