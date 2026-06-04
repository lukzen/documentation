# ADR-004: Multi-Tenant Compute Isolation — Namespace-per-Agency at Launch, vcluster as Triggered Escalation

**Status:** Proposed
**Date:** 2026-06-04
**Authors:** Ergos Continental Engineering
**Deciders:** Lukasz

---

## Context

[ADR-003](003-multitenant-mongodb-isolation.md) moved per-agency data isolation from physical (MongoDB-per-tenant instance) to logical (database-per-tenant on a shared cluster + tenancy middleware + CI cross-tenant-read test) until the ~1,500-agency hard trigger. That decision lifted the question of compute isolation: if the data layer is shared, what level of Kubernetes-side isolation do agencies actually need?

[`alibaba-infra/PRODUCTION_READINESS.md`](https://github.com/lukzen/alibaba-infra/blob/master/PRODUCTION_READINESS.md) item #8 currently mandates **[vcluster](https://www.vcluster.com/) per agency** — a full virtual Kubernetes control plane (API server, scheduler, controller manager) running inside the host cluster's namespace. The case for vcluster is real but assumes a tenant model that Ergos doesn't have at v1.0:

- **vcluster's strongest argument** is that tenant admins get cluster-admin privileges within their virtual cluster while being unable to touch other tenants or the host. Agencies in Ergos's model do not get Kubernetes admin access — they interact with `agency-app` over HTTPS, not `kubectl`.
- **vcluster's secondary argument** is CRD/operator isolation — one tenant installing a custom controller doesn't leak to others. Again, n/a — agencies don't install operators.
- **vcluster's compliance argument** is the cleanest sentence in a SOC-2 audit: "tenants are physically separated at the Kubernetes control plane." Ergos's v1.0 compliance target does not require this level of separation.

What agencies actually need at v1.0 is:

1. **Workload isolation** — Agency A's pods can't see Agency B's pods, memory, network sockets, or filesystem.
2. **Network isolation** — A pod in `vc-acme` cannot connect to a pod in `vc-globex` unless an explicit `NetworkPolicy` allows it.
3. **Resource ceiling** — Agency A's pods can't consume all the cluster's CPU/RAM and starve other agencies.
4. **Per-agency RBAC** — Operators who need to administer one agency's workload can be granted access to that agency's resources only.
5. **Per-agency Helm releases** — Independent agency-app + backend-service versions per tenant.
6. **Tenant-scoped Istio routing** — `acme.lukzen-op.com` → the agency-app service in `vc-acme`.
7. **Clean teardown** — When an agency churns, removing its resources is one operation.

**All seven of these are achieved by a standard Kubernetes namespace** with the platform primitives the cluster will run anyway: RBAC, NetworkPolicy, ResourceQuota, LimitRange, Istio VirtualService scoped to the namespace. The vcluster control plane adds operational overhead, RAM footprint, and complexity that buys nothing for the tenant model in scope.

This ADR codifies the policy: **launch with namespace-per-agency; escalate to vcluster only when specific triggers fire**.

---

## Operating assumptions

- v1.0 target tenant count: 5–50 active agencies in the first year; 100–500 by year three; ~1,500+ in steady state (per ADR-003's analysis).
- Agencies do not receive Kubernetes API access. They administer their accounts via the agency-app and backoffice UIs.
- Compliance target at v1.0 is **internal operational discipline + SOC-2 readiness**, not active SOC-2/ISO-27001 certification. Active certification with a regulated agency (banking corporate-travel) is a possible future trigger but is not in scope today.
- Workload per agency is small: `agency-app` (1 replica default, scalable to 2+) + `backend-service` (1 replica default, scalable to 2+). No agency-specific operators, CRDs, or admission webhooks.
- The data layer is the shared MongoDB cluster per ADR-003 — it sits outside both vcluster and namespace scope.
- Host cluster is Alibaba ACK Managed Kubernetes (current v1.32+).

---

## What each isolation option provides

### Option A — Namespace-per-agency (recommended)

One Kubernetes namespace per tenant (`vc-acme`, `vc-globex`, `vc-ergos`, …) with the standard primitives:

| Concern | Mechanism | Reference |
|---|---|---|
| Workload isolation | Pod, network, IPC namespaces (the kernel primitives) — automatic | [K8s Namespaces docs](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/) |
| RBAC | `Role` + `RoleBinding` scoped to the namespace | [RBAC docs](https://kubernetes.io/docs/reference/access-authn-authz/rbac/) |
| Network isolation | `NetworkPolicy` with default-deny ingress + explicit per-namespace allows | [NetworkPolicy docs](https://kubernetes.io/docs/concepts/services-networking/network-policies/) |
| Resource quotas | `ResourceQuota` for namespace-level CPU/RAM/PVC/object caps | [ResourceQuota docs](https://kubernetes.io/docs/concepts/policy/resource-quotas/) |
| Pod-level defaults | `LimitRange` for per-pod requests/limits | [LimitRange docs](https://kubernetes.io/docs/concepts/policy/limit-range/) |
| Secret isolation | Secrets are namespace-scoped by default | [Secrets docs](https://kubernetes.io/docs/concepts/configuration/secret/) |
| Service discovery | DNS scoped to namespace; cross-namespace requires FQDN + RBAC | [DNS for services docs](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/) |
| Tenant teardown | `kubectl delete namespace vc-acme` removes everything | (built-in) |
| Pod Security Standards | `pod-security.kubernetes.io/enforce: restricted` label per namespace | [PSA docs](https://kubernetes.io/docs/concepts/security/pod-security-admission/) |

### Option B — vcluster-per-agency

A virtual Kubernetes cluster inside a host-cluster namespace. Each vcluster gets its own:

| Component | What it does | Resource cost |
|---|---|---|
| vcluster control plane (k3s/k0s/k8s-distroless) | Virtual API server, scheduler, controller manager, optional virtual etcd | ~200–500 MB RAM idle; pods to schedule |
| Virtual CoreDNS | Tenant-scoped service DNS | ~50 MB RAM |
| Sync controllers | Mirror Pods/Services/PVCs to the host | CPU per workload change |
| Optional sleep-mode controller (vcluster Pro) | Scale-to-zero idle vclusters | (Pro license) |

What vcluster adds *on top of* the namespace primitives Option A already provides:

- **Virtual API surface** — tenant admins can `kubectl` against the vcluster as cluster-admin without seeing host objects.
- **Per-tenant CRD installations** — one tenant's `cert-manager` CRD doesn't pollute another's.
- **Control-plane noisy-neighbor isolation** — one tenant's heavy API usage doesn't starve other tenants' API calls.
- **Tenant-scoped audit logs and events** — kubectl events are local to the vcluster.

For Ergos v1.0, none of these line items maps to a real requirement.

---

## Cost analysis

### Memory overhead per agency

Per vcluster baseline footprint (from [vcluster sizing guide](https://www.vcluster.com/docs/vcluster/deploy/sizing) and community-measured idle):

- Distroless vcluster control plane: ~250 MB RAM idle
- Virtual CoreDNS: ~50 MB RAM
- Sync controllers: ~100 MB RAM during workload changes
- **Total: ~400 MB RAM per agency, baseline, before agency workload starts**

At three node sizes for the host ACK cluster (Alibaba ECS `ecs.g7.large` = 2 vCPU/8 GB, `ecs.g7.xlarge` = 4 vCPU/16 GB, `ecs.g7.2xlarge` = 8 vCPU/32 GB), here's how many vcluster control planes consume how much of available cluster RAM before any actual tenant workload is scheduled:

| Cluster shape | Allocatable RAM | vcluster overhead at 10 agencies | at 50 | at 100 | at 500 |
|---|---|---|---|---|---|
| 2× `g7.large` (16 GB total) | ~12 GB | 4 GB (33%) | 20 GB (overflow) | — | — |
| 2× `g7.xlarge` (32 GB) | ~26 GB | 4 GB (15%) | 20 GB (77%) | 40 GB (overflow) | — |
| 4× `g7.2xlarge` (128 GB) | ~110 GB | 4 GB (4%) | 20 GB (18%) | 40 GB (36%) | 200 GB (overflow) |

Compare against namespace-per-agency, which adds *zero* baseline RAM overhead — a namespace is a Kubernetes API object, not a runtime container.

### Operational overhead

- **Patching and upgrades** — N vclusters means N control planes to upgrade when a Kubernetes CVE drops. The host cluster's standard ACK upgrade handles host-level patching; each vcluster needs an independent upgrade.
- **Monitoring** — Prometheus scrapes each vcluster's control plane separately. Alerts must be tagged per-tenant.
- **Backups** — vcluster state (in its SQLite or embedded etcd) needs backup independently from the host cluster's etcd.
- **Audit log fanout** — N control planes means N log streams.
- **Tooling friction** — standard `kubectl get all -A` doesn't see vcluster contents directly; agency-side debugging needs explicit context switching.

None of these are show-stoppers, but each represents real ongoing operational cost that scales linearly with agency count.

### Onboarding speed

| Step | Namespace-per-agency | vcluster-per-agency |
|---|---|---|
| Create the tenant boundary | `kubectl create ns vc-acme` (~1 s) | `helm install vc-acme vcluster/vcluster -n vc-acme` (~3–5 min) |
| Wait for ready | n/a | wait for control-plane pods to be Ready |
| Bootstrap RBAC/quotas/policies | Apply manifests (~5 s) | Apply manifests inside the vcluster (~5 s additional) |
| Deploy agency-app + backend-service | `helm install agency-app …` (~30 s) | `helm install … --kube-context vcluster-acme` (~30 s) |
| **Total for one onboard** | **~40 seconds** | **~5 minutes** |

For an early-stage platform expecting to onboard 1–2 agencies per week, the vcluster onboarding cost is tolerable. For an agency-sales motion that aims at 100+/year, namespace-per-agency removes a constant 4-minute tax from every onboarding.

---

## Decision

**Adopt namespace-per-agency as the v1.0 compute isolation primitive.** Reframe `PRODUCTION_READINESS.md` item #8 from "vcluster per agency" to "namespace-per-agency with `NetworkPolicy` + `ResourceQuota` + per-namespace RBAC + Istio VirtualService scoped to the namespace."

**vcluster escalation triggers** — promote a specific agency from a namespace to a vcluster only when *at least one* of these is true:

1. **Admin-access trigger** — the agency contractually requires their staff to have direct Kubernetes API access (kubectl) to their workload (extraordinarily unusual outside enterprise integrations).
2. **CRD-isolation trigger** — the agency installs a custom operator or controller that would conflict with another agency's installation.
3. **Regulated-customer trigger** — a regulated agency (banking, government, healthcare) signs a contract that specifies physical control-plane isolation as a SOC-2 / ISO-27001 / HIPAA control. The control must be in writing in the agreement.
4. **Noisy-neighbor trigger** — measurable evidence that one tenant's K8s API usage is degrading the host cluster API server. The metric: p99 API request latency at the host API server sustained > 500 ms for > 24 h, with a per-tenant attribution that exceeds 30% of API calls.
5. **Cost-saving trigger** — at 500+ agencies, vcluster sleep-mode for genuinely idle tenants demonstrably pays for itself against the control-plane overhead. Requires explicit measurement before any commitment.

**Promotion path** — when a trigger fires for an agency, that single agency moves from `kind: Namespace` to a vcluster running in the same host namespace. Other agencies stay as namespaces. The platform supports both topologies concurrently — there is no migration of the whole platform.

**Demotion path** — when a tenant's reason for vcluster goes away (e.g., contract change), demote back to namespace. Helm releases inside the vcluster get re-applied in the namespace; no data migration is needed because data lives in the shared MongoDB cluster per ADR-003.

---

## Consequences

### Positive

- **Onboarding cost drops by ~4 minutes per agency.** At 100 agencies/year, that's ~7 hours of operator time saved annually; more important is the reduction in error surface during onboarding.
- **Baseline cluster RAM saved.** A 50-agency platform saves ~20 GB RAM that would otherwise sit as idle vcluster control planes. That's the difference between needing 3 `g7.2xlarge` nodes vs 4.
- **Standard tooling works.** `kubectl get all -A`, `stern`, `k9s`, Grafana with kube-state-metrics — all give a single-cluster view without context juggling.
- **Patching surface shrinks.** One control plane to upgrade for K8s CVEs, not N.
- **Helm + Istio + cert-manager + ExternalDNS work without per-tenant configuration drift.**

### Negative

- **The "tenants are physically separated at the K8s control plane" sentence is no longer true.** This will surface in any future compliance audit that wants control-plane isolation. Mitigation: the audit response is the documented NetworkPolicy + RBAC + ResourceQuota matrix, plus the trigger #3 escalation policy.
- **K8s API noisy-neighbor is theoretically possible.** Mitigation: the trigger #4 metric watches for it actively.
- **CRD pollution is theoretically possible.** Mitigation: cluster-admin retains gatekeeper authority on what CRDs install at all; agencies have no way to install them via the agency-app/backoffice UIs.

### Risks

- **A future regulated agency signs and demands physical isolation faster than we can migrate them.** Mitigation: design the agency-app + backend-service Helm chart from day 1 so that swapping `--namespace vc-acme` for `--kube-context vcluster-acme` is a one-flag change in the onboarding playbook.
- **An ops team-member confuses namespace-per-agency for shared-namespace.** Mitigation: explicit naming convention (`vc-<agency>` for every agency namespace) + RBAC test in CI that asserts cross-namespace reads from agency credentials fail.

---

## Alternatives considered

### Option A1 — Shared namespace, per-agency labels

All agency workloads in a single `applications` namespace, distinguished by labels (`tenant=acme`, etc.).

**Rejected.** Loses Kubernetes-native RBAC (which is per-namespace), loses default-deny network isolation between agencies, makes tenant teardown a multi-step kubectl-delete with selector matching that's easy to get wrong. The shared-namespace pattern only works when tenants are extremely lightweight (single config row per tenant) and the platform has bespoke isolation logic everywhere — neither applies here.

### Option A — Namespace-per-agency (this ADR's recommendation)

See main decision above.

### Option B — vcluster-per-agency from day 1 (the original PRODUCTION_READINESS plan)

See main analysis above.

**Rejected for v1.0** because the tenant model does not need what vcluster provides and the overhead is non-trivial. Retained as the targeted escalation under the five triggers above.

### Option C — Virtual machine per agency (Kata Containers or Firecracker)

Each tenant pod runs inside a microVM for hypervisor-level isolation.

**Rejected.** This is overkill for the tenant model. Kata's startup time penalty (multi-second cold start), node-level kernel pinning, and operational complexity (Kata version skew against ACK's K8s version) make this a defensive-industry pattern that doesn't fit a travel-booking platform. Considered post-v2.0 if and only if a sovereign-data tenant signs.

### Option D — Separate physical clusters per agency

A dedicated Alibaba ACK cluster per agency.

**Rejected.** ACK cluster overhead is ~$70/month minimum (management fee) per cluster regardless of node count. At 100 agencies, this is $7k/mo just for cluster management before any compute. Plus cluster-level Istio Gateway, cert-manager, and monitoring installations multiplied by N. The cost crossover is roughly N=2 — Option D becomes pricier than Option B (vcluster) almost immediately.

### Option E — Capsule operator for namespace tenancy enhancement

[Capsule](https://capsule.clastix.io/) is a CNCF tenant-management operator that adds tenant-aware features on top of namespace primitives (tenant quotas, network policy templates, RBAC inheritance).

**Considered as a future enhancement, not adopted at v1.0.** Capsule is a sensible add-on once the platform crosses ~30 agencies and per-namespace policy templates start drifting. It is *not* a substitute for the namespace primitives themselves — it's a management layer that automates them. Adoption can happen at any point without re-architecting.

---

## Implementation triggers (early-warning metrics)

Each must have a published Grafana panel before the platform takes its first paying agency. The thresholds below are the *warning* level; the *escalation* level for each is 2× the warning.

| Metric | Warning threshold | What it tells us |
|---|---|---|
| Host API server p99 latency (24-hour sustained) | 500 ms | Control-plane noisy-neighbor (trigger #4) |
| Host API server requests per second by tenant ServiceAccount | > 30% from one tenant | Single-tenant API dominance, evaluate per-tenant rate limits or vcluster |
| Idle host RAM with all vclusters running (if any) | < 20% | Hardware approaching saturation; consider scale-out before adding more vclusters |
| Agency count of vcluster-promoted tenants | > 5% of total agencies | Process drift; review whether the original triggers are being respected |
| Onboarding p95 time-to-first-traffic | > 2 minutes | Onboarding has accumulated friction beyond the namespace baseline |

---

## References

- ADR-003 — Multi-Tenant MongoDB Shared-Cluster Breakpoint: [003-multitenant-mongodb-isolation.md](003-multitenant-mongodb-isolation.md)
- PRODUCTION_READINESS.md item #8 (alibaba-infra repo): https://github.com/lukzen/alibaba-infra/blob/master/PRODUCTION_READINESS.md
- Kubernetes Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes RBAC: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ResourceQuota: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- vcluster Architecture: https://www.vcluster.com/docs/vcluster/architecture/
- vcluster Sizing Guide: https://www.vcluster.com/docs/vcluster/deploy/sizing
- Capsule Operator (CNCF): https://capsule.clastix.io/
