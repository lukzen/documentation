# Production Readiness Assessment: Alibaba Cloud Infrastructure

**Repository:** `alibaba-infra`
**Type:** Terraform Infrastructure as Code
**Cloud Provider:** Alibaba Cloud (Primary)
**Assessment Date:** 2025-11-28
**Current Status:** ⚠️ Functional but CRITICAL Security Issues

---

## Executive Summary

The alibaba-infra repository provides Terraform-based infrastructure for Alibaba Cloud Kubernetes (ACK), networking, storage, and load balancing. The infrastructure has **CRITICAL security vulnerabilities** (hard-coded credentials) that must be fixed immediately. Once secured, it requires enhancements for high availability, monitoring, automation, and disaster recovery.

**Production Readiness Score: 40/100**

| Category | Score | Status |
|----------|-------|--------|
| Security | 15/100 | ❌ CRITICAL: Hardcoded credentials in source code |
| Reliability | 50/100 | Single AZ deployment, no automated backups |
| Availability | 45/100 | Single node, no HPA, no health monitoring |
| Scalability | 60/100 | Cluster autoscaler configured but limited |
| Observability | 25/100 | Basic tagging, no monitoring stack |
| Maintainability | 70/100 | Good Terraform structure, decent documentation |
| Automation | 40/100 | Manual deployments, no GitOps |
| Disaster Recovery | 30/100 | OSS bucket exists but no backup automation |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [🚨 Critical Security Vulnerability 🚨](#-critical-security-vulnerability-)
   - [Hardcoded Credentials in Source Code](#hardcoded-credentials-in-source-code)
   - [Step 1: Revoke Compromised Credentials](#step-1-revoke-compromised-credentials)
   - [Step 2: Remove Credentials from Repository](#step-2-remove-credentials-from-repository)
   - [Step 4: Migrate to Environment Variables](#step-4-migrate-to-environment-variables)
   - [Step 5: Use Alibaba Cloud Secret Manager (Recommended)](#step-5-use-alibaba-cloud-secret-manager-recommended)
   - [Step 6: Create .env.example for Documentation](#step-6-create-envexample-for-documentation)
3. [Infrastructure Architecture](#infrastructure-architecture)
   - [Current State](#current-state)
   - [Required Production Architecture](#required-production-architecture)
4. [Critical Production Gaps](#critical-production-gaps)
   - [1. Single Point of Failure (Availability: 45/100)](#1-single-point-of-failure-availability-45100)
   - [2. Monitoring & Observability (Score: 25/100)](#2-monitoring--observability-score-25100)
   - [3. SSL/TLS Certificate Automation (Currently Manual)](#3-ssltls-certificate-automation-currently-manual)
   - [4. DNS Automation (Currently Manual)](#4-dns-automation-currently-manual)
   - [5. Managed Databases (Currently: Self-Managed in ACK)](#5-managed-databases-currently-self-managed-in-ack)
   - [6. Backup & Disaster Recovery (Score: 30/100)](#6-backup--disaster-recovery-score-30100)
5. [Application Deployment Configurations](#application-deployment-configurations)
   - [7. Agency App Deployment (Customer-Facing SPA)](#7-agency-app-deployment-customer-facing-spa)
   - [8. Backend Service Deployment (Node.js API)](#8-backend-service-deployment-nodejs-api)
   - [9. Backoffice App Deployment (Admin Dashboard)](#9-backoffice-app-deployment-admin-dashboard)
   - [10. Shared Infrastructure Components](#10-shared-infrastructure-components)
     - [Nginx Ingress Controller](#nginx-ingress-controller)
     - [Gateway API Migration (Future Roadmap)](#gateway-api-migration-future-roadmap)
6. [Cloud Provider Comparison (For Reference)](#cloud-provider-comparison-for-reference)
   - [Alibaba Cloud vs AWS vs GCP vs Azure](#alibaba-cloud-vs-aws-vs-gcp-vs-azure)
7. [Implementation Roadmap](#implementation-roadmap)
   - [Phase 1: Critical Security (Week 1) - IMMEDIATE](#phase-1-critical-security-week-1---immediate)
   - [Phase 2: High Availability (Weeks 2-3)](#phase-2-high-availability-weeks-2-3)
   - [Phase 3: Managed Services (Weeks 4-5)](#phase-3-managed-services-weeks-4-5)
   - [Phase 4: Automation (Weeks 6-7)](#phase-4-automation-weeks-6-7)
   - [Phase 5: Observability (Weeks 8-9)](#phase-5-observability-weeks-8-9)
   - [Phase 6: Backup & DR (Week 10)](#phase-6-backup--dr-week-10)
   - [Phase 7: Security Hardening (Week 11)](#phase-7-security-hardening-week-11)
   - [Phase 8: Cost Optimization & Finalization (Week 12)](#phase-8-cost-optimization--finalization-week-12)
8. [Total Cost Summary](#total-cost-summary)
   - [Current Monthly Cost (Estimated)](#current-monthly-cost-estimated)
   - [Production-Ready Monthly Cost (Estimated)](#production-ready-monthly-cost-estimated)
   - [One-Time Implementation Costs](#one-time-implementation-costs)
   - [Cost-Benefit Analysis](#cost-benefit-analysis)
9. [Success Metrics](#success-metrics)
   - [Pre-Production (Current)](#pre-production-current)
   - [Post-Production (Target)](#post-production-target)
10. [Conclusion](#conclusion)

---

## 🚨 CRITICAL SECURITY VULNERABILITY 🚨

### Hardcoded Credentials in Source Code

**Location:** `terraform.tfvars` and `variables.tf`

```terraform
# terraform.tfvars - EXPOSED CREDENTIALS
access_key = "LTAI5tDAQrJSgkpERpE1zf31"        # ❌ DANGER!
secret_key = "vrrAM0uXkLpnUMlsFLrE5TPkoocw2I"  # ❌ DANGER!
instance_password = "StrongPass123!"           # ❌ DANGER!
```

**Impact:**
- Full Alibaba Cloud account compromise
- Unauthorized resource creation/deletion
- Data breach potential
- Compliance violation (SOC 2, ISO 27001, PCI DSS)

**IMMEDIATE ACTION REQUIRED (Within 24 hours):**

### Step 1: Revoke Compromised Credentials

```bash
# Login to Alibaba Cloud console
aliyun ram ListAccessKeys --UserName=terraform-user

# Delete compromised keys
aliyun ram DeleteAccessKey \
  --UserName=terraform-user \
  --AccessKeyId=LTAI5tDAQrJSgkpERpE1zf31

# Generate new access key (via console, do NOT commit)
```

### Step 2: Remove Credentials from Repository

```bash
# Remove terraform.tfvars from git completely
git rm --cached terraform.tfvars

# Add to .gitignore if not already there
echo "terraform.tfvars" >> .gitignore
echo "*.tfvars" >> .gitignore

# Commit the removal
git commit -m "Remove hardcoded credentials (SECURITY FIX)"
git push origin main
```

###Step 3: Remove from Git History

```bash
# Install BFG Repo Cleaner
brew install bfg

# Clone a fresh bare repository
git clone --mirror <repository-url> alibaba-infra-mirror.git

# Remove terraform.tfvars from all history
bfg --delete-files terraform.tfvars alibaba-infra-mirror.git

# Garbage collect
cd alibaba-infra-mirror.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push cleaned history
git push --force

# Clean up
cd ..
rm -rf alibaba-infra-mirror.git

# Re-clone the repository
git clone <repository-url>
```

### Step 4: Migrate to Environment Variables

```bash
# Create .env file (add to .gitignore)
cat > .env << 'ENV_EOF'
export ALIBABA_CLOUD_ACCESS_KEY_ID="new-access-key-id"
export ALIBABA_CLOUD_ACCESS_KEY_SECRET="new-secret-key"
export TF_VAR_region="na-south-1"
export TF_VAR_cluster_name="operations"
ENV_EOF

# Add .env to .gitignore
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore

# Load environment variables
source .env

# Update provider.tf to use environment variables
```

```terraform
# provider.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.249.0"
    }
  }

  backend "oss" {
    bucket = "oneclick-terraform-state"
    prefix = "k8s"
    key    = "terraform.tfstate"
    region = "na-south-1"
    # Credentials from environment variables
    # access_key and secret_key intentionally omitted
  }
}

provider "alicloud" {
  region = var.region
  # Credentials read from ALIBABA_CLOUD_ACCESS_KEY_ID and
  # ALIBABA_CLOUD_ACCESS_KEY_SECRET environment variables
  # DO NOT specify access_key or secret_key here
}
```

### Step 5: Use Alibaba Cloud Secret Manager (Recommended)

```terraform
# modules/secrets/main.tf
data "alicloud_kms_secret" "terraform_access" {
  secret_name = "terraform-access-credentials"
}

locals {
  credentials = jsondecode(data.alicloud_kms_secret.terraform_access.secret_data)
}

output "access_key_id" {
  value     = local.credentials.access_key_id
  sensitive = true
}

output "secret_access_key" {
  value     = local.credentials.secret_access_key
  sensitive = true
}
```

```terraform
# main.tf
module "secrets" {
  source = "./modules/secrets"
}

provider "alicloud" {
  region     = var.region
  access_key = module.secrets.access_key_id
  secret_key = module.secrets.secret_access_key
}
```

### Step 6: Create .env.example for Documentation

```bash
# .env.example
ALIBABA_CLOUD_ACCESS_KEY_ID=your-access-key-id
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your-secret-access-key
TF_VAR_region=na-south-1
TF_VAR_cluster_name=operations
TF_VAR_k8s_version=1.28
```

---

## Infrastructure Architecture

### Current State

```
┌─────────────────────────────────────────────────────┐
│ Alibaba Cloud Region: na-south-1 (São Paulo)       │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │ VPC: 10.0.0.0/16                           │   │
│  │                                             │   │
│  │  ┌──────────────────────────────────────┐  │   │
│  │  │ vSwitch: 10.0.1.0/24 (na-south-1a)   │  │   │
│  │  │                                       │  │   │
│  │  │  ┌─────────────────────────────────┐ │  │   │
│  │  │  │ ACK Cluster (K8s 1.32.7)       │ │  │   │
│  │  │  │ - 1 node (ecs.g8a.xlarge)     │ │  │   │
│  │  │  │ - Pod CIDR: 172.16.0.0/16     │ │  │   │
│  │  │  │ - Service CIDR: 172.19.0.0/20 │ │  │   │
│  │  │  └─────────────────────────────────┘ │  │   │
│  │  └──────────────────────────────────────┘  │   │
│  │                                             │   │
│  │  ┌──────────────────────────────────────┐  │   │
│  │  │ Security Group: oneclick-app-sg      │  │   │
│  │  │ - HTTP (80): 0.0.0.0/0              │  │   │
│  │  │ - HTTPS (443): 0.0.0.0/0            │  │   │
│  │  │ - NodePort: 10.0.0.0/16 only        │  │   │
│  │  └──────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │ Load Balancer                              │   │
│  │ - SLB: lb-4hfhsmqlw08gymj19hur0           │   │
│  │ - EIP: 47.87.14.183                        │   │
│  │ - SSL: lukzen-op-ssl-cert                  │   │
│  │ - HTTPS Listener: Port 443 → NodePort     │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │ OSS Bucket: oneclick-terraform-state       │   │
│  │ - Versioning: Enabled                      │   │
│  │ - Encryption: AES256                       │   │
│  │ - Lifecycle: 90-day retention              │   │
│  └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Required Production Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│ Alibaba Cloud Region: na-south-1 (São Paulo)                     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ VPC: 10.0.0.0/16                                         │   │
│  │                                                           │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────┐
│  │  │ vSwitch (AZ-A)      │  │ vSwitch (AZ-B)      │  │ vSwitch (AZ-C) │
│  │  │ 10.0.1.0/24         │  │ 10.0.2.0/24         │  │ 10.0.3.0/24    │
│  │  │                     │  │                     │  │                │
│  │  │ ┌─────────────────┐ │  │ ┌─────────────────┐ │  │ ┌────────────┐ │
│  │  │ │ ACK Node        │ │  │ │ ACK Node        │ │  │ │ ACK Node   │ │
│  │  │ │ (System Pool)   │ │  │ │ (System Pool)   │ │  │ │ (System)   │ │
│  │  │ └─────────────────┘ │  │ └─────────────────┘ │  │ └────────────┘ │
│  │  │                     │  │                     │  │                │
│  │  │ ┌─────────────────┐ │  │ ┌─────────────────┐ │  │ ┌────────────┐ │
│  │  │ │ ACK Node        │ │  │ │ ACK Node        │ │  │ │ ACK Node   │ │
│  │  │ │ (App Pool)      │ │  │ │ (App Pool)      │ │  │ │ (App Pool) │ │
│  │  │ └─────────────────┘ │  │ └─────────────────┘ │  │ └────────────┘ │
│  │  └─────────────────────┘  └─────────────────────┘  └────────────────┘
│  │                                                           │   │
│  │  ┌──────────────────────────────────────────────────────┐   │
│  │  │ ApsaraDB for MongoDB (3-node Replica Set)            │   │
│  │  │ - Primary (AZ-A)  - Secondary (AZ-B)  - Secondary (AZ-C)
│  │  └──────────────────────────────────────────────────────┘   │
│  │                                                           │   │
│  │  ┌──────────────────────────────────────────────────────┐   │
│  │  │ ApsaraDB for Redis (Master-Replica)                  │   │
│  │  │ - Master (AZ-A)  - Replica (AZ-B)                    │   │
│  │  └──────────────────────────────────────────────────────┘   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ SLB (Multi-AZ)                                           │   │
│  │ - Health checks across all AZs                          │   │
│  │ - cert-manager managed TLS                              │   │
│  │ - external-dns managed DNS                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Monitoring & Logging                                     │   │
│  │ - ARMS (APM, metrics, tracing)                          │   │
│  │ - SLS (centralized logging)                             │   │
│  │ - CloudMonitor (infrastructure metrics)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Backup & DR                                              │   │
│  │ - OSS: Daily snapshots + lifecycle management           │   │
│  │ - Cross-region replication (optional)                   │   │
│  │ - Velero: K8s resource backups                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Critical Production Gaps

### 1. SINGLE POINT OF FAILURE (Availability: 45/100)

**Current Issues:**
- ❌ Single availability zone deployment
- ❌ Single ACK node (no redundancy)
- ❌ Single vSwitch
- ❌ No node pool separation (system vs application workloads)

**Required: Multi-AZ Deployment**

```terraform
# variables.tf
variable "availability_zones" {
  description = "Availability zones for multi-AZ deployment"
  type        = list(string)
  default     = ["na-south-1a", "na-south-1b", "na-south-1c"]
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

# modules/network/vpc.tf
resource "alicloud_vpc" "main" {
  vpc_name   = "${var.cluster_name}-vpc"
  cidr_block = var.vpc_cidr

  tags = {
    Name        = "${var.cluster_name}-vpc"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "alicloud_vswitch" "vswitches" {
  count = length(var.availability_zones)

  vpc_id     = alicloud_vpc.main.id
  zone_id    = var.availability_zones[count.index]
  cidr_block = cidrsubnet(var.vpc_cidr, 8, count.index)

  vswitch_name = "${var.cluster_name}-vswitch-${var.availability_zones[count.index]}"

  tags = {
    Name        = "${var.cluster_name}-vswitch-${count.index + 1}"
    Zone        = var.availability_zones[count.index]
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "alicloud_nat_gateway" "nat" {
  count = length(var.availability_zones)

  vpc_id               = alicloud_vpc.main.id
  vswitch_id           = alicloud_vswitch.vswitches[count.index].id
  nat_gateway_name     = "${var.cluster_name}-nat-${var.availability_zones[count.index]}"
  nat_type             = "Enhanced"
  internet_charge_type = "PayByLcu"

  tags = {
    Name        = "${var.cluster_name}-nat-${count.index + 1}"
    Zone        = var.availability_zones[count.index]
    Environment = var.environment
  }
}
```

**ACK Cluster with Multi-AZ Node Pools:**

```terraform
# modules/ack/cluster.tf
resource "alicloud_cs_managed_kubernetes" "cluster" {
  name_prefix               = var.cluster_name
  cluster_spec              = "ack.pro.small"  # Professional Edition for production
  version                   = var.k8s_version
  new_nat_gateway          = false  # Using pre-created NAT gateways
  install_cloud_monitor    = true
  slb_internet_enabled     = true

  # Multi-AZ configuration
  master_vswitch_ids = alicloud_vswitch.vswitches[*].id
  master_instance_types = ["ecs.c7.xlarge"]

  # Control plane across 3 AZs
  master_count = 3

  # Network configuration
  pod_cidr              = "172.16.0.0/16"
  service_cidr          = "172.19.0.0/20"
  slb_internal_enabled = true

  # Addons
  addons {
    name = "terway-eniip"  # Container network plugin
  }

  addons {
    name = "csi-plugin"  # Storage plugin
  }

  addons {
    name = "csi-provisioner"
  }

  addons {
    name = "logtail-ds"  # Logging
    config = jsonencode({
      "IngressDashboardEnabled" = "true"
    })
  }

  addons {
    name = "ack-node-problem-detector"  # Node health monitoring
  }

  addons {
    name = "ack-arms-prometheus"  # Prometheus monitoring
  }

  lifecycle {
    ignore_changes = [
      new_nat_gateway,
      worker_number,
      worker_instance_types,
      worker_vswitch_ids
    ]
  }
}

# System node pool (for Kubernetes system components)
resource "alicloud_cs_kubernetes_node_pool" "system" {
  cluster_id     = alicloud_cs_managed_kubernetes.cluster.id
  name           = "system-pool"
  node_pool_type = "ess"

  # Multi-AZ deployment
  vswitch_ids = alicloud_vswitch.vswitches[*].id

  # Scaling configuration
  scaling_config {
    min_size         = 3  # 1 per AZ minimum
    max_size         = 6  # 2 per AZ maximum
    type             = "cpu"
    is_bond_eip      = false
    eip_internet_charge_type = "PayByBandwidth"
    eip_bandwidth    = 5
  }

  # Node configuration
  instance_types = ["ecs.c7.xlarge"]
  system_disk_category = "cloud_essd"
  system_disk_size     = 120

  # Taints for system workloads only
  taints {
    key    = "node-role"
    value  = "system"
    effect = "NoSchedule"
  }

  # Labels
  labels {
    key   = "workload-type"
    value = "system"
  }

  # Auto-repair
  management {
    enable        = true
    auto_repair   = true
    auto_upgrade  = false
  }
}

# Application node pool (for user workloads)
resource "alicloud_cs_kubernetes_node_pool" "application" {
  cluster_id     = alicloud_cs_managed_kubernetes.cluster.id
  name           = "app-pool"
  node_pool_type = "ess"

  # Multi-AZ deployment
  vswitch_ids = alicloud_vswitch.vswitches[*].id

  # Scaling configuration
  scaling_config {
    min_size         = 3  # 1 per AZ minimum
    max_size         = 30 # 10 per AZ maximum
    type             = "cpu"
    is_bond_eip      = false
  }

  # Node configuration
  instance_types = ["ecs.g7.xlarge", "ecs.g7.2xlarge"]
  system_disk_category = "cloud_essd"
  system_disk_size     = 120

  # Data disk for container storage
  data_disks {
    category          = "cloud_essd"
    size              = 200
    encrypted         = true
    performance_level = "PL1"
  }

  # Labels
  labels {
    key   = "workload-type"
    value = "application"
  }

  # Auto-scaling
  auto_scaling {
    enable                = true
    type                  = "cpu"
    is_bond_eip          = false
    min_size             = 3
    max_size             = 30
    cooldown_duration    = 300
  }

  # Auto-repair and upgrade
  management {
    enable        = true
    auto_repair   = true
    auto_upgrade  = true
    max_unavailable = 1
  }
}

# Spot instance node pool (for cost optimization of non-critical workloads)
resource "alicloud_cs_kubernetes_node_pool" "spot" {
  cluster_id     = alicloud_cs_managed_kubernetes.cluster.id
  name           = "spot-pool"
  node_pool_type = "ess"

  vswitch_ids = alicloud_vswitch.vswitches[*].id

  scaling_config {
    min_size         = 0
    max_size         = 20
    type             = "cpu"
    is_bond_eip      = false
  }

  # Spot instance configuration
  spot_strategy = "SpotWithPriceLimit"
  spot_price_limit {
    instance_type = "ecs.g7.xlarge"
    price_limit   = "0.25"  # Maximum hourly price
  }

  instance_types = ["ecs.g7.xlarge"]
  system_disk_category = "cloud_essd"
  system_disk_size     = 120

  # Taints for spot workloads
  taints {
    key    = "node-type"
    value  = "spot"
    effect = "NoSchedule"
  }

  labels {
    key   = "workload-type"
    value = "batch"
  }

  management {
    enable        = true
    auto_repair   = true
    auto_upgrade  = false
  }
}
```

**Cost Impact:**
- Current (1 node): ~$100-150/month
- Multi-AZ (6 nodes: 3 system + 3 app): ~$600-800/month
- **Benefit:** 99.95% availability SLA vs no SLA

---

### 2. MONITORING & OBSERVABILITY (Score: 25/100)

**Current State:**
- ❌ No ARMS (Application Real-Time Monitoring Service)
- ❌ No SLS (Simple Log Service) for centralized logging
- ❌ No CloudMonitor alerts
- ⚠️ Basic resource tagging only

**Required: Comprehensive Monitoring Stack**

```terraform
# modules/monitoring/arms.tf
resource "alicloud_arms_prometheus" "main" {
  cluster_type = "aliyun-cs"
  cluster_id   = alicloud_cs_managed_kubernetes.cluster.id

  grafana_instance_id = alicloud_grafana_workspace.main.id

  tags = {
    Name        = "${var.cluster_name}-prometheus"
    Environment = var.environment
  }
}

resource "alicloud_grafana_workspace" "main" {
  grafana_workspace_name = "${var.cluster_name}-grafana"
  grafana_version        = "9.0.x"
  description            = "OneClickAdventures monitoring and observability"

  tags = {
    Name        = "${var.cluster_name}-grafana"
    Environment = var.environment
  }
}

resource "alicloud_arms_alert_contact" "oncall" {
  alert_contact_name = "oncall-team"
  email              = var.oncall_email
  phone_num          = var.oncall_phone
}

resource "alicloud_arms_alert_contact_group" "primary" {
  alert_contact_group_name = "primary-oncall"
  contact_ids              = [alicloud_arms_alert_contact.oncall.id]
}

# Prometheus alert rules
resource "alicloud_arms_prometheus_alert_rule" "high_cpu" {
  cluster_id     = alicloud_cs_managed_kubernetes.cluster.id
  alert_name     = "High CPU Usage"
  expression     = "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100) > 80"
  duration       = "5"
  message        = "CPU usage is above 80% for 5 minutes"
  notify_type    = "ALERT_MANAGER"

  labels = {
    severity = "warning"
  }

  annotations = {
    summary     = "High CPU usage detected"
    description = "{{ $labels.instance }} has {{ $value }}% CPU usage"
  }
}

resource "alicloud_arms_prometheus_alert_rule" "pod_restart" {
  cluster_id     = alicloud_cs_managed_kubernetes.cluster.id
  alert_name     = "Pod Restart Loop"
  expression     = "rate(kube_pod_container_status_restarts_total[15m]) > 0"
  duration       = "5"
  message        = "Pod is restarting frequently"
  notify_type    = "ALERT_MANAGER"

  labels = {
    severity = "critical"
  }
}
```

**Centralized Logging with SLS:**

```terraform
# modules/logging/sls.tf
resource "alicloud_log_project" "main" {
  name        = "${var.cluster_name}-logs"
  description = "Centralized logging for OneClickAdventures"

  tags = {
    Name        = "${var.cluster_name}-logs"
    Environment = var.environment
  }
}

resource "alicloud_log_store" "k8s_audit" {
  project               = alicloud_log_project.main.name
  name                  = "k8s-audit"
  retention_period      = 90  # 90 days for audit logs
  shard_count           = 2
  auto_split            = true
  max_split_shard_count = 64

  encrypt_conf {
    enable       = true
    encrypt_type = "default"
  }
}

resource "alicloud_log_store" "containers" {
  project               = alicloud_log_project.main.name
  name                  = "container-logs"
  retention_period      = 30  # 30 days for container logs
  shard_count           = 2
  auto_split            = true
  max_split_shard_count = 64
}

resource "alicloud_log_store" "application" {
  project               = alicloud_log_project.main.name
  name                  = "application-logs"
  retention_period      = 30
  shard_count           = 2
  auto_split            = true
  max_split_shard_count = 64
}

# Log index for search
resource "alicloud_log_store_index" "container_index" {
  project  = alicloud_log_project.main.name
  logstore = alicloud_log_store.containers.name

  full_text {
    case_sensitive = false
    token          = " \t\n\r,"
  }

  field_search {
    name             = "pod_name"
    enable_analytics = true
    type             = "text"
  }

  field_search {
    name             = "namespace"
    enable_analytics = true
    type             = "text"
  }

  field_search {
    name             = "container_name"
    enable_analytics = true
    type             = "text"
  }

  field_search {
    name             = "level"
    enable_analytics = true
    type             = "text"
  }
}

# Alerting for application errors
resource "alicloud_log_alert" "application_errors" {
  project_name = alicloud_log_project.main.name
  alert_name   = "high-error-rate"
  alert_displayname = "High Application Error Rate"

  schedule {
    type     = "FixedRate"
    interval = "5m"
  }

  query_list {
    store  = alicloud_log_store.application.name
    query  = "level: ERROR | SELECT COUNT(*) as error_count"
    start  = "-5m"
    end    = "now"
  }

  condition = "error_count > 100"

  notification_list {
    type    = "DingTalk"
    webhook = var.dingtalk_webhook
    content = "High error rate detected: {{ .error_count }} errors in 5 minutes"
  }

  notification_list {
    type    = "Email"
    email_list = [var.oncall_email]
    content = "High error rate detected in application logs"
  }
}
```

**Cost Impact:**
- ARMS: ~$80-120/month
- SLS: ~$40-80/month (depends on log volume)
- **Total:** ~$120-200/month

---

### 3. SSL/TLS CERTIFICATE AUTOMATION (Currently Manual)

**Current State:**
- ⚠️ SSL certificate manually uploaded to SLB
- ❌ Manual renewal required
- ❌ No automation for certificate lifecycle

**Required: cert-manager Integration**

```terraform
# modules/k8s-addons/cert-manager.tf
resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  namespace  = "cert-manager"
  version    = "v1.14.0"

  create_namespace = true

  set {
    name  = "installCRDs"
    value = "true"
  }

  set {
    name  = "global.leaderElection.namespace"
    value = "cert-manager"
  }

  set {
    name  = "prometheus.enabled"
    value = "true"
  }

  # Resource limits
  set {
    name  = "resources.requests.cpu"
    value = "100m"
  }

  set {
    name  = "resources.requests.memory"
    value = "128Mi"
  }

  set {
    name  = "resources.limits.cpu"
    value = "200m"
  }

  set {
    name  = "resources.limits.memory"
    value = "256Mi"
  }

  depends_on = [alicloud_cs_managed_kubernetes.cluster]
}

# ClusterIssuer for Let's Encrypt Staging (for testing)
resource "kubectl_manifest" "letsencrypt_staging" {
  depends_on = [helm_release.cert_manager]

  yaml_body = <<-YAML
    apiVersion: cert-manager.io/v1
    kind: ClusterIssuer
    metadata:
      name: letsencrypt-staging
    spec:
      acme:
        server: https://acme-staging-v02.api.letsencrypt.org/directory
        email: ${var.letsencrypt_email}
        privateKeySecretRef:
          name: letsencrypt-staging-key
        solvers:
        # HTTP-01 challenge for simple domains
        - http01:
            ingress:
              class: nginx
        # DNS-01 challenge for wildcard certificates
        - dns01:
            alibabaDNS:
              accessKeySecretRef:
                name: alibaba-dns-credentials
                key: access-key-id
              secretKeySecretRef:
                name: alibaba-dns-credentials
                key: secret-access-key
              regionId: ${var.region}
  YAML
}

# ClusterIssuer for Let's Encrypt Production
resource "kubectl_manifest" "letsencrypt_prod" {
  depends_on = [helm_release.cert_manager]

  yaml_body = <<-YAML
    apiVersion: cert-manager.io/v1
    kind: ClusterIssuer
    metadata:
      name: letsencrypt-prod
    spec:
      acme:
        server: https://acme-v02.api.letsencrypt.org/directory
        email: ${var.letsencrypt_email}
        privateKeySecretRef:
          name: letsencrypt-prod-key
        solvers:
        - http01:
            ingress:
              class: nginx
        - dns01:
            alibabaDNS:
              accessKeySecretRef:
                name: alibaba-dns-credentials
                key: access-key-id
              secretKeySecretRef:
                name: alibaba-dns-credentials
                key: secret-access-key
              regionId: ${var.region}
  YAML
}

# Create Kubernetes secret with Alibaba DNS credentials
resource "kubernetes_secret" "alibaba_dns" {
  metadata {
    name      = "alibaba-dns-credentials"
    namespace = "cert-manager"
  }

  data = {
    access-key-id     = var.alibaba_access_key
    secret-access-key = var.alibaba_secret_key
  }

  type = "Opaque"

  depends_on = [helm_release.cert_manager]
}
```

**Cost Impact:** $0 (Let's Encrypt is free, cert-manager runs on existing cluster)

---

### 4. DNS AUTOMATION (Currently Manual)

**Current State:**
- ❌ DNS records manually created in Alibaba DNS console
- ❌ No automation when services are deployed/deleted
- ❌ Manual updates required for load balancer changes

**Required: external-dns Integration**

```terraform
# modules/k8s-addons/external-dns.tf
resource "helm_release" "external_dns" {
  name       = "external-dns"
  repository = "https://kubernetes-sigs.github.io/external-dns/"
  chart      = "external-dns"
  namespace  = "kube-system"
  version    = "1.14.0"

  set {
    name  = "provider"
    value = "alibabacloud"
  }

  set_sensitive {
    name  = "env[0].name"
    value = "ALICLOUD_ACCESS_KEY"
  }

  set_sensitive {
    name  = "env[0].value"
    value = var.alibaba_access_key
  }

  set_sensitive {
    name  = "env[1].name"
    value = "ALICLOUD_SECRET_KEY"
  }

  set_sensitive {
    name  = "env[1].value"
    value = var.alibaba_secret_key
  }

  set {
    name  = "env[2].name"
    value = "ALICLOUD_REGION_ID"
  }

  set {
    name  = "env[2].value"
    value = var.region
  }

  # Policy: sync = create and delete records, upsert-only = create only
  set {
    name  = "policy"
    value = "sync"
  }

  # Ownership tracking via TXT records
  set {
    name  = "txtOwnerId"
    value = "${var.cluster_name}-external-dns"
  }

  # Only manage DNS for these domains
  set {
    name  = "domainFilters[0]"
    value = "lukzen-op.com"
  }

  # Sources to watch
  set {
    name  = "sources[0]"
    value = "ingress"
  }

  set {
    name  = "sources[1]"
    value = "service"
  }

  # Log level
  set {
    name  = "logLevel"
    value = "info"
  }

  # Dry run mode (set to false for actual updates)
  set {
    name  = "dryRun"
    value = "false"
  }

  # Metrics
  set {
    name  = "metrics.enabled"
    value = "true"
  }

  set {
    name  = "metrics.serviceMonitor.enabled"
    value = "true"
  }

  depends_on = [alicloud_cs_managed_kubernetes.cluster]
}
```

**Cost Impact:** ~$1/month (DNS query charges), external-dns runs on existing cluster

---

### 5. MANAGED DATABASES (Currently: Self-Managed in ACK)

**Current State:**
- ❌ MongoDB running as pods in Kubernetes (not production-ready)
- ❌ No automated backups
- ❌ No multi-AZ replication
- ❌ Manual scaling and maintenance

**Required: ApsaraDB for MongoDB**

```terraform
# modules/database/mongodb.tf
resource "alicloud_mongodb_instance" "main" {
  # Instance specs
  engine_version      = "4.4"
  storage_engine      = "WiredTiger"
  replication_factor  = 3  # 3-node replica set
  storage_type        = "cloud_essd"

  # Capacity
  db_instance_storage = 500  # 500 GB
  db_instance_class   = "dds.mongo.mid"  # 4 vCPU, 16 GB RAM per node

  # Network
  network_type  = "VPC"
  vswitch_id    = alicloud_vswitch.vswitches[0].id

  # Security
  security_ip_list = [var.vpc_cidr]
  ssl_action       = "Open"  # Enable SSL
  tde_status       = "Enabled"  # Transparent Data Encryption

  # Backup
  backup_time   = "02:00Z-03:00Z"  # Daily backup at 2 AM UTC
  backup_period = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  backup_retention_period = 30  # 30 days retention

  # Maintenance window
  maintain_start_time = "03:00Z"
  maintain_end_time   = "04:00Z"

  # Naming
  db_instance_description = "${var.cluster_name}-mongodb"

  tags = {
    Name        = "${var.cluster_name}-mongodb"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Create databases
resource "alicloud_mongodb_account" "app" {
  instance_id       = alicloud_mongodb_instance.main.id
  account_name      = "app_user"
  account_password  = var.mongodb_password
  account_type      = "Normal"

  account_privilege {
    db_name  = "backoffice"
    privilege = "readWrite"
  }

  account_privilege {
    db_name  = "salesagent"
    privilege = "readWrite"
  }

  account_privilege {
    db_name  = "travelagency"
    privilege = "readWrite"
  }
}

# Connection string output (for applications)
output "mongodb_connection_string" {
  value = "mongodb://${alicloud_mongodb_account.app.account_name}:${var.mongodb_password}@${alicloud_mongodb_instance.main.connection_domain}:3717/?replicaSet=mgset-XXXXXX&authSource=admin"
  sensitive = true
}
```

**ApsaraDB for Redis (Caching Layer):**

```terraform
# modules/database/redis.tf
resource "alicloud_kvstore_instance" "main" {
  # Instance specs
  instance_type  = "Redis"
  engine_version = "6.0"
  instance_class = "redis.master.small.default"  # 2 GB

  # Architecture
  architecture_type = "standard"  # Master-Replica

  # Network
  vswitch_id     = alicloud_vswitch.vswitches[0].id
  private_ip     = cidrhost(alicloud_vswitch.vswitches[0].cidr_block, 10)

  # Security
  security_ips = [var.vpc_cidr]
  ssl_enable   = "Enable"

  # Backup
  backup_time    = "02:00Z-03:00Z"
  backup_period  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  # Maintenance
  maintain_start_time = "03:00Z"
  maintain_end_time   = "04:00Z"

  # Naming
  instance_name = "${var.cluster_name}-redis"

  tags = {
    Name        = "${var.cluster_name}-redis"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

output "redis_connection_string" {
  value     = "${alicloud_kvstore_instance.main.connection_domain}:6379"
  sensitive = true
}
```

**Cost Impact:**
- ApsaraDB for MongoDB (3-node replica): ~$400-500/month
- ApsaraDB for Redis (2 GB): ~$80-120/month
- **Total:** ~$480-620/month
- **Benefit:** Automated backups, multi-AZ HA, automated failover, maintenance

---

### 6. BACKUP & DISASTER RECOVERY (Score: 30/100)

**Current State:**
- ⚠️ OSS bucket exists for Terraform state
- ❌ No Kubernetes resource backups
- ❌ No automated backup testing
- ❌ No disaster recovery runbook

**Required: Velero for K8s Backups**

```terraform
# modules/backup/velero.tf
resource "alicloud_oss_bucket" "velero" {
  bucket = "${var.cluster_name}-velero-backups"
  acl    = "private"

  # Versioning for backup history
  versioning {
    status = "Enabled"
  }

  # Encryption
  server_side_encryption_rule {
    sse_algorithm = "AES256"
  }

  # Lifecycle management
  lifecycle_rule {
    id      = "delete-old-backups"
    enabled = true

    prefix = "backups/"

    expiration {
      days = 90  # Keep backups for 90 days
    }

    noncurrent_version_expiration {
      days = 30  # Keep old versions for 30 days
    }
  }

  tags = {
    Name        = "${var.cluster_name}-velero-backups"
    Environment = var.environment
    Purpose     = "Kubernetes Backups"
  }
}

resource "helm_release" "velero" {
  name       = "velero"
  repository = "https://vmware-tanzu.github.io/helm-charts"
  chart      = "velero"
  namespace  = "velero"
  version    = "5.2.0"

  create_namespace = true

  # Velero configuration
  set {
    name  = "configuration.provider"
    value = "alibabacloud"
  }

  set {
    name  = "configuration.backupStorageLocation.name"
    value = "default"
  }

  set {
    name  = "configuration.backupStorageLocation.bucket"
    value = alicloud_oss_bucket.velero.id
  }

  set {
    name  = "configuration.backupStorageLocation.config.region"
    value = var.region
  }

  # Credentials (stored in Kubernetes secret)
  set_sensitive {
    name  = "credentials.secretContents.cloud"
    value = <<-EOF
      ALIBABA_CLOUD_ACCESS_KEY_ID=${var.alibaba_access_key}
      ALIBABA_CLOUD_ACCESS_KEY_SECRET=${var.alibaba_secret_key}
    EOF
  }

  # Backup schedules
  set {
    name  = "schedules.daily.schedule"
    value = "0 2 * * *"  # Daily at 2 AM
  }

  set {
    name  = "schedules.daily.template.ttl"
    value = "720h"  # 30 days
  }

  set {
    name  = "schedules.daily.template.includeNamespaces"
    value = "default,production,staging"
  }

  set {
    name  = "schedules.weekly.schedule"
    value = "0 3 * * 0"  # Weekly on Sunday at 3 AM
  }

  set {
    name  = "schedules.weekly.template.ttl"
    value = "2160h"  # 90 days
  }

  # Resource limits
  set {
    name  = "resources.requests.cpu"
    value = "500m"
  }

  set {
    name  = "resources.requests.memory"
    value = "512Mi"
  }

  set {
    name  = "resources.limits.cpu"
    value = "1000m"
  }

  set {
    name  = "resources.limits.memory"
    value = "1024Mi"
  }

  # Metrics
  set {
    name  = "metrics.enabled"
    value = "true"
  }

  set {
    name  = "metrics.serviceMonitor.enabled"
    value = "true"
  }

  depends_on = [
    alicloud_cs_managed_kubernetes.cluster,
    alicloud_oss_bucket.velero
  ]
}
```

**Backup Testing Automation:**

```bash
#!/bin/bash
# scripts/test-backup-restore.sh

set -e

CLUSTER_NAME="operations"
BACKUP_NAME="test-backup-$(date +%Y%m%d-%H%M%S)"
TEST_NAMESPACE="backup-test"

echo "Creating test namespace..."
kubectl create namespace ${TEST_NAMESPACE}

echo "Deploying test application..."
kubectl apply -n ${TEST_NAMESPACE} -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
      - name: nginx
        image: nginx:latest
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
data:
  test-key: test-value
EOF

echo "Creating backup..."
velero backup create ${BACKUP_NAME} \
  --include-namespaces ${TEST_NAMESPACE} \
  --wait

echo "Deleting namespace..."
kubectl delete namespace ${TEST_NAMESPACE}

echo "Waiting 30 seconds..."
sleep 30

echo "Restoring from backup..."
velero restore create --from-backup ${BACKUP_NAME} --wait

echo "Verifying restoration..."
kubectl get all -n ${TEST_NAMESPACE}

if kubectl get configmap test-config -n ${TEST_NAMESPACE} &> /dev/null; then
  echo "✅ Backup and restore test PASSED"
  exit 0
else
  echo "❌ Backup and restore test FAILED"
  exit 1
fi
```

**Cost Impact:**
- OSS storage (~100 GB backups): ~$3-5/month
- Velero (runs on existing cluster): $0
- **Total:** ~$3-5/month

---

## Application Deployment Configurations

This section contains all Kubernetes deployment configurations, manifests, and operational concerns for the three application repositories. Application-level code quality is documented separately in their respective production readiness documents.

### 7. Agency App Deployment (Customer-Facing SPA)

**Application:** React single-page application for customers to search and book hotels
**Code Quality Document:** `PRODUCTION_READINESS_AGENCY_APP.md`

#### Kubernetes Deployment Manifest

```yaml
# k8s/agency-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agency-app
  namespace: production
  labels:
    app: agency-app
    tier: frontend
    environment: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero downtime deployments
  selector:
    matchLabels:
      app: agency-app
  template:
    metadata:
      labels:
        app: agency-app
        tier: frontend
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "80"
        prometheus.io/path: "/metrics"
    spec:
      # Security
      securityContext:
        runAsNonRoot: true
        runAsUser: 101  # nginx user
        fsGroup: 101

      # Anti-affinity for multi-AZ distribution
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - agency-app
              topologyKey: topology.kubernetes.io/zone
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: workload-type
                operator: In
                values:
                - application

      containers:
      - name: agency-app
        image: registry.na-south-1.aliyuncs.com/oneclick/agency-app:latest
        imagePullPolicy: Always

        ports:
        - name: http
          containerPort: 80
          protocol: TCP

        # Resource limits
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi

        # Liveness probe
        livenessProbe:
          httpGet:
            path: /
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        # Readiness probe
        readinessProbe:
          httpGet:
            path: /
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3

        # Environment configuration
        envFrom:
        - configMapRef:
            name: agency-app-config

        # Security context
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL

        # Temporary directories (since root filesystem is read-only)
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /var/cache/nginx
        - name: run
          mountPath: /var/run

      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
      - name: run
        emptyDir: {}

      # Image pull secret for Alibaba Container Registry
      imagePullSecrets:
      - name: acr-credentials
```

#### Service Configuration

```yaml
# k8s/agency-app/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: agency-app
  namespace: production
  labels:
    app: agency-app
    tier: frontend
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app: agency-app
```

#### Ingress with SSL and DNS Automation

```yaml
# k8s/agency-app/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: agency-app
  namespace: production
  annotations:
    # cert-manager: Automatic SSL certificate provisioning
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    cert-manager.io/acme-challenge-type: "http01"

    # external-dns: Automatic DNS record creation
    external-dns.alpha.kubernetes.io/hostname: "www.lukzen-op.com"
    external-dns.alpha.kubernetes.io/ttl: "300"

    # Nginx ingress controller settings
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"
    nginx.ingress.kubernetes.io/ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384"

    # Security headers
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header X-Frame-Options "SAMEORIGIN" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header X-XSS-Protection "1; mode=block" always;
      add_header Referrer-Policy "strict-origin-when-cross-origin" always;
      add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.lukzen-op.com;" always;

    # Rate limiting
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-connections: "50"

    # Gzip compression
    nginx.ingress.kubernetes.io/enable-gzip: "true"
    nginx.ingress.kubernetes.io/gzip-level: "6"
    nginx.ingress.kubernetes.io/gzip-types: "text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript"
  labels:
    app: agency-app
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - www.lukzen-op.com
    - lukzen-op.com
    secretName: agency-app-tls  # Created automatically by cert-manager
  rules:
  - host: www.lukzen-op.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: agency-app
            port:
              number: 80
  - host: lukzen-op.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: agency-app
            port:
              number: 80
```

#### Horizontal Pod Autoscaler

```yaml
# k8s/agency-app/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: agency-app
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: agency-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  # CPU-based scaling
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  # Memory-based scaling
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

  # Custom metrics (requests per second)
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"

  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 minutes
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 4
        periodSeconds: 30
      selectPolicy: Max
```

#### ConfigMap

```yaml
# k8s/agency-app/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: agency-app-config
  namespace: production
data:
  VITE_API_BASE_URL: "https://api.lukzen-op.com"
  VITE_ENVIRONMENT: "production"
  VITE_GOOGLE_MAPS_API_KEY: ""  # Set via external secret management
  VITE_SENTRY_DSN: ""  # Set via external secret management
  VITE_ANALYTICS_ID: ""
  NODE_ENV: "production"
```

#### Pod Disruption Budget

```yaml
# k8s/agency-app/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: agency-app
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: agency-app
```

---

### 8. Backend Service Deployment (Node.js API)

**Application:** Node.js/Express API server with TypeScript
**Code Quality Document:** `PRODUCTION_READINESS_BACKEND_SERVICE.md`

#### Kubernetes Deployment Manifest

```yaml
# k8s/backend-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-service
  namespace: production
  labels:
    app: backend-service
    tier: backend
    environment: production
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backend-service
  template:
    metadata:
      labels:
        app: backend-service
        tier: backend
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      # Security
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000

      # Anti-affinity for multi-AZ distribution
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - backend-service
              topologyKey: topology.kubernetes.io/zone
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: workload-type
                operator: In
                values:
                - application

      # Init container for database migrations
      initContainers:
      - name: db-migrations
        image: registry.na-south-1.aliyuncs.com/oneclick/backend-service:latest
        command: ['npm', 'run', 'migrate']
        envFrom:
        - configMapRef:
            name: backend-service-config
        - secretRef:
            name: backend-service-secrets
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi

      containers:
      - name: backend-service
        image: registry.na-south-1.aliyuncs.com/oneclick/backend-service:latest
        imagePullPolicy: Always

        ports:
        - name: http
          containerPort: 3000
          protocol: TCP
        - name: metrics
          containerPort: 9090
          protocol: TCP

        # Resource limits
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi

        # Liveness probe (checks if app is alive)
        livenessProbe:
          httpGet:
            path: /api/v1/health/liveness
            port: http
          initialDelaySeconds: 60
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        # Readiness probe (checks if app is ready to serve traffic)
        readinessProbe:
          httpGet:
            path: /api/v1/health/readiness
            port: http
          initialDelaySeconds: 30
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3

        # Startup probe (for slow-starting applications)
        startupProbe:
          httpGet:
            path: /api/v1/health/startup
            port: http
          initialDelaySeconds: 0
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30  # 5 minutes to start

        # Environment configuration
        envFrom:
        - configMapRef:
            name: backend-service-config
        - secretRef:
            name: backend-service-secrets

        # Additional environment variables
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName

        # Security context
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL

        # Volume mounts
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: logs
          mountPath: /app/logs

      volumes:
      - name: tmp
        emptyDir: {}
      - name: logs
        emptyDir: {}

      # Image pull secret
      imagePullSecrets:
      - name: acr-credentials
```

#### Health Check Endpoints Implementation

These endpoints should be implemented in the backend-service code:

```typescript
// src/routes/health.routes.ts
import { Router } from 'express'
import { HealthController } from '../controllers/health.controller'

const router = Router()
const healthController = new HealthController()

// Liveness probe: Is the app alive?
router.get('/liveness', healthController.liveness)

// Readiness probe: Is the app ready to serve traffic?
router.get('/readiness', healthController.readiness)

// Startup probe: Has the app finished starting?
router.get('/startup', healthController.startup)

export default router
```

```typescript
// src/controllers/health.controller.ts
import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { redis } from '../config/redis'

export class HealthController {
  // Liveness: Basic check that process is running
  async liveness(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  }

  // Readiness: Check dependencies are available
  async readiness(req: Request, res: Response): Promise<void> {
    const checks = {
      mongodb: false,
      redis: false
    }

    try {
      // Check MongoDB
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping()
        checks.mongodb = true
      }

      // Check Redis
      const redisPing = await redis.ping()
      checks.redis = redisPing === 'PONG'

      const isReady = checks.mongodb && checks.redis

      res.status(isReady ? 200 : 503).json({
        status: isReady ? 'ready' : 'not ready',
        checks,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        checks,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    }
  }

  // Startup: Check if app has fully initialized
  async startup(req: Request, res: Response): Promise<void> {
    try {
      const isMongoConnected = mongoose.connection.readyState === 1
      const isRedisConnected = redis.status === 'ready'

      const isStarted = isMongoConnected && isRedisConnected

      res.status(isStarted ? 200 : 503).json({
        status: isStarted ? 'started' : 'starting',
        mongodb: isMongoConnected,
        redis: isRedisConnected,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      res.status(503).json({
        status: 'starting',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    }
  }
}
```

#### Service Configuration

```yaml
# k8s/backend-service/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: production
  labels:
    app: backend-service
    tier: backend
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: metrics
    protocol: TCP
  selector:
    app: backend-service
  sessionAffinity: None
```

#### Ingress Configuration

```yaml
# k8s/backend-service/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-service
  namespace: production
  annotations:
    # cert-manager
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    cert-manager.io/acme-challenge-type: "http01"

    # external-dns
    external-dns.alpha.kubernetes.io/hostname: "api.lukzen-op.com"
    external-dns.alpha.kubernetes.io/ttl: "300"

    # Nginx settings
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"

    # CORS (handled by application, but can be configured here as backup)
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://www.lukzen-op.com,https://lukzen-op.com"
    nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization"

    # Rate limiting (more aggressive for API)
    nginx.ingress.kubernetes.io/limit-rps: "500"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
    nginx.ingress.kubernetes.io/limit-connections: "100"

    # Request body size
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"

    # Timeouts
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"

    # Security headers
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header X-Frame-Options "DENY" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header X-XSS-Protection "1; mode=block" always;
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  labels:
    app: backend-service
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.lukzen-op.com
    secretName: backend-service-tls
  rules:
  - host: api.lukzen-op.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
```

#### Horizontal Pod Autoscaler

```yaml
# k8s/backend-service/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-service
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-service
  minReplicas: 5
  maxReplicas: 50
  metrics:
  # CPU-based scaling
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  # Memory-based scaling
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

  # Custom metrics
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "500"

  - type: Pods
    pods:
      metric:
        name: http_request_duration_p99
      target:
        type: AverageValue
        averageValue: "500m"  # 500ms

  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 25
        periodSeconds: 60
      - type: Pods
        value: 5
        periodSeconds: 60
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 10
        periodSeconds: 30
      selectPolicy: Max
```

#### ConfigMap

```yaml
# k8s/backend-service/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-service-config
  namespace: production
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"

  # CORS
  CORS_ORIGIN: "https://www.lukzen-op.com,https://lukzen-op.com"

  # Rate limiting
  RATE_LIMIT_WINDOW_MS: "900000"  # 15 minutes
  RATE_LIMIT_MAX_REQUESTS: "100"

  # External APIs
  DINGUS_API_BASE_URL: "https://xml-uat.bookingengine.es"
  HOTETEC_API_BASE_URL: "https://api-edocs.ejuniper.com"

  # Feature flags
  FEATURE_TROPIPAY_ENABLED: "true"
  FEATURE_BOOKING_ENABLED: "true"

  # Monitoring
  SENTRY_ENVIRONMENT: "production"
  ENABLE_METRICS: "true"
  METRICS_PORT: "9090"
```

#### Secret (Template)

```yaml
# k8s/backend-service/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-service-secrets
  namespace: production
type: Opaque
stringData:
  # Database
  MONGODB_URI: "mongodb://app_user:PASSWORD@dds-xxxxx.mongodb.na-south-1.aliyuncs.com:3717/backoffice?replicaSet=mgset-xxxxx&authSource=admin"
  REDIS_URL: "redis://:PASSWORD@r-xxxxx.redis.na-south-1.aliyuncs.com:6379"

  # JWT
  JWT_SECRET: ""  # Generate with: openssl rand -base64 64
  JWT_EXPIRES_IN: "7d"
  JWT_REFRESH_SECRET: ""
  JWT_REFRESH_EXPIRES_IN: "30d"

  # External API credentials
  DINGUS_USERNAME: ""
  DINGUS_PASSWORD: ""
  HOTETEC_API_KEY: ""
  ROIBOS_API_KEY: ""

  # TropiPay
  TROPIPAY_CLIENT_ID: ""
  TROPIPAY_CLIENT_SECRET: ""
  TROPIPAY_SERVER_URL: "https://tropipay-dev.herokuapp.com/api/v2"

  # Monitoring
  SENTRY_DSN: ""

  # Encryption
  ENCRYPTION_KEY: ""  # For sensitive data at rest
```

#### Pod Disruption Budget

```yaml
# k8s/backend-service/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: backend-service
  namespace: production
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: backend-service
```

---

### 9. Backoffice App Deployment (Admin Dashboard)

**Application:** React admin dashboard with enhanced security
**Code Quality Document:** `PRODUCTION_READINESS_BACKOFFICE_APP.md`

#### Kubernetes Deployment Manifest

```yaml
# k8s/backoffice-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backoffice-app
  namespace: production
  labels:
    app: backoffice-app
    tier: frontend
    security: high
    environment: production
spec:
  replicas: 2  # Lower replica count for admin dashboard
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backoffice-app
  template:
    metadata:
      labels:
        app: backoffice-app
        tier: frontend
        security: high
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "80"
    spec:
      # Security
      securityContext:
        runAsNonRoot: true
        runAsUser: 101
        fsGroup: 101

      # Node affinity (prefer multi-AZ)
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - backoffice-app
              topologyKey: topology.kubernetes.io/zone
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: workload-type
                operator: In
                values:
                - application

      containers:
      - name: backoffice-app
        image: registry.na-south-1.aliyuncs.com/oneclick/backoffice-app:latest
        imagePullPolicy: Always

        ports:
        - name: http
          containerPort: 80
          protocol: TCP

        # Resource limits (admin dashboard is less resource-intensive)
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 300m
            memory: 512Mi

        # Liveness probe
        livenessProbe:
          httpGet:
            path: /
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        # Readiness probe
        readinessProbe:
          httpGet:
            path: /
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3

        # Environment configuration
        envFrom:
        - configMapRef:
            name: backoffice-app-config

        # Security context
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL

        # Volume mounts
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /var/cache/nginx
        - name: run
          mountPath: /var/run

      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
      - name: run
        emptyDir: {}

      # Image pull secret
      imagePullSecrets:
      - name: acr-credentials
```

#### Service Configuration

```yaml
# k8s/backoffice-app/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backoffice-app
  namespace: production
  labels:
    app: backoffice-app
    tier: frontend
    security: high
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app: backoffice-app
```

#### NetworkPolicy for IP Allowlisting

**CRITICAL SECURITY:** Backoffice should only be accessible from trusted IPs

```yaml
# k8s/backoffice-app/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backoffice-app-allow-trusted-ips
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backoffice-app
      security: high
  policyTypes:
  - Ingress
  - Egress

  ingress:
  # Allow traffic from nginx-ingress controller only
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
      podSelector:
        matchLabels:
          app.kubernetes.io/name: ingress-nginx
    ports:
    - protocol: TCP
      port: 80

  # Allow traffic from Prometheus for metrics scraping
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
      podSelector:
        matchLabels:
          app: prometheus
    ports:
    - protocol: TCP
      port: 80

  egress:
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53

  # Allow backend API access
  - to:
    - podSelector:
        matchLabels:
          app: backend-service
    ports:
    - protocol: TCP
      port: 80

  # Allow HTTPS to external services
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
---
# Additional IP-based restriction at ingress level
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backoffice-app
  namespace: production
  annotations:
    # IP allowlist (office IPs only)
    nginx.ingress.kubernetes.io/whitelist-source-range: |
      203.0.113.0/24,
      198.51.100.0/24,
      192.0.2.0/24

    # If user is not from allowed IP, show this error
    nginx.ingress.kubernetes.io/custom-http-errors: "403"
    nginx.ingress.kubernetes.io/default-backend: custom-error-pages
```

**Alternative: VPN-only Access via Private Load Balancer**

```yaml
# k8s/backoffice-app/service-internal.yaml
apiVersion: v1
kind: Service
metadata:
  name: backoffice-app-internal
  namespace: production
  annotations:
    service.beta.kubernetes.io/alibaba-cloud-loadbalancer-address-type: "intranet"
    service.beta.kubernetes.io/alibaba-cloud-loadbalancer-name: "backoffice-internal-lb"
  labels:
    app: backoffice-app
    access: internal
spec:
  type: LoadBalancer
  loadBalancerSourceRanges:
  - 10.0.0.0/8  # Internal VPC only
  - 172.16.0.0/12  # VPN range
  ports:
  - port: 443
    targetPort: http
    protocol: TCP
    name: https
  selector:
    app: backoffice-app
```

#### Ingress Configuration

```yaml
# k8s/backoffice-app/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backoffice-app
  namespace: production
  annotations:
    # cert-manager
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    cert-manager.io/acme-challenge-type: "http01"

    # external-dns
    external-dns.alpha.kubernetes.io/hostname: "admin.lukzen-op.com"
    external-dns.alpha.kubernetes.io/ttl: "300"

    # Nginx settings
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.3"

    # CRITICAL: IP allowlisting for admin access
    nginx.ingress.kubernetes.io/whitelist-source-range: |
      203.0.113.10/32,
      198.51.100.0/24

    # Security headers (stricter for admin)
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header X-Frame-Options "DENY" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header X-XSS-Protection "1; mode=block" always;
      add_header Referrer-Policy "no-referrer" always;
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
      add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.lukzen-op.com; frame-ancestors 'none';" always;
      add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Rate limiting (stricter for admin)
    nginx.ingress.kubernetes.io/limit-rps: "20"
    nginx.ingress.kubernetes.io/limit-connections: "10"

    # Authentication timeout
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "30"
  labels:
    app: backoffice-app
    security: high
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - admin.lukzen-op.com
    secretName: backoffice-app-tls
  rules:
  - host: admin.lukzen-op.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backoffice-app
            port:
              number: 80
```

#### Horizontal Pod Autoscaler

```yaml
# k8s/backoffice-app/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backoffice-app
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backoffice-app
  minReplicas: 2
  maxReplicas: 6  # Lower max for admin dashboard
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

  behavior:
    scaleDown:
      stabilizationWindowSeconds: 600  # 10 minutes (slower for admin)
      policies:
      - type: Pods
        value: 1
        periodSeconds: 120
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60
```

#### ConfigMap

```yaml
# k8s/backoffice-app/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backoffice-app-config
  namespace: production
data:
  VITE_API_BASE_URL: "https://api.lukzen-op.com"
  VITE_ENVIRONMENT: "production"
  VITE_SENTRY_DSN: ""
  NODE_ENV: "production"

  # Security settings
  VITE_SESSION_TIMEOUT_MS: "900000"  # 15 minutes
  VITE_MFA_ENABLED: "true"
  VITE_AUDIT_LOG_ENABLED: "true"
```

#### Pod Disruption Budget

```yaml
# k8s/backoffice-app/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: backoffice-app
  namespace: production
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: backoffice-app
```

---

### 10. Shared Infrastructure Components

These components are shared across all three applications.

#### Nginx Ingress Controller

> **⚠️ Deprecation Notice**: Nginx Ingress Controller is being phased out. The Kubernetes **Gateway API** (formerly Ingress v2) is the recommended next-generation solution. Migration to Gateway API is included in the roadmap (Phase 4) and will provide:
> - Native Kubernetes API (no third-party controllers)
> - Advanced traffic routing (weighted, header-based, mirroring)
> - Better multi-tenancy support
> - Standardized across cloud providers
> - Official Kubernetes project (graduated to GA in Kubernetes 1.29+)
>
> See [Gateway API Migration](#gateway-api-migration-future-roadmap) below for details.

```terraform
# modules/k8s-addons/nginx-ingress.tf
# CURRENT: Nginx Ingress (to be replaced with Gateway API)
resource "helm_release" "nginx_ingress" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress-nginx"
  version    = "4.9.0"

  create_namespace = true

  # Controller configuration
  set {
    name  = "controller.replicaCount"
    value = "3"  # Multi-AZ deployment
  }

  # Anti-affinity for multi-AZ
  set {
    name  = "controller.affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].weight"
    value = "100"
  }

  set {
    name  = "controller.affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].podAffinityTerm.topologyKey"
    value = "topology.kubernetes.io/zone"
  }

  # Service configuration
  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }

  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/alibaba-cloud-loadbalancer-address-type"
    value = "internet"
  }

  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/alibaba-cloud-loadbalancer-spec"
    value = "slb.s3.small"
  }

  # Metrics
  set {
    name  = "controller.metrics.enabled"
    value = "true"
  }

  set {
    name  = "controller.metrics.serviceMonitor.enabled"
    value = "true"
  }

  # Resource limits
  set {
    name  = "controller.resources.requests.cpu"
    value = "200m"
  }

  set {
    name  = "controller.resources.requests.memory"
    value = "256Mi"
  }

  set {
    name  = "controller.resources.limits.cpu"
    value = "1000m"
  }

  set {
    name  = "controller.resources.limits.memory"
    value = "1Gi"
  }

  depends_on = [alicloud_cs_managed_kubernetes.cluster]
}
```

---

### Gateway API Migration (Future Roadmap)

**Status:** Planned for Phase 4 (Automation) - Week 7
**Priority:** Medium (technical debt reduction, future-proofing)

#### Why Migrate from Nginx Ingress to Gateway API?

The Kubernetes **Gateway API** is the official successor to the Ingress API and provides a more powerful, flexible, and standardized approach to traffic management:

**Key Benefits:**
- **Kubernetes-Native**: Part of core Kubernetes APIs (sig-network project)
- **Advanced Routing**: Header-based, weighted traffic splitting, mirroring, request/response modification
- **Multi-Tenancy**: Built-in namespace isolation and role-based delegation
- **Standardized**: Same API works across all cloud providers (Alibaba Cloud, AWS, GCP, Azure)
- **Extensible**: Plugin architecture for custom behavior
- **Type-Safe**: Strongly typed resources with better validation

**Migration Path:**

```terraform
# modules/k8s-addons/gateway-api.tf
# Step 1: Install Gateway API CRDs (if not included in ACK)
resource "kubernetes_manifest" "gateway_api_crds" {
  manifest = yamldecode(file("${path.module}/gateway-api-crds.yaml"))
}

# Step 2: Install Gateway API controller (Alibaba Cloud ALB Controller)
resource "helm_release" "alb_gateway_controller" {
  name       = "alb-ingress-controller"
  repository = "https://alb-charts.oss-cn-hangzhou.aliyuncs.com"
  chart      = "alb-ingress-controller"
  namespace  = "kube-system"
  version    = "1.0.0"

  set {
    name  = "clusterName"
    value = alicloud_cs_managed_kubernetes.cluster.name
  }

  set {
    name  = "serviceAccount.name"
    value = "alb-ingress-controller"
  }
}
```

**Example: Gateway Resource**

```yaml
# Gateway (replaces Ingress Controller)
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: production
spec:
  gatewayClassName: alb  # Alibaba Cloud ALB
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: Same
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: wildcard-tls-cert
      allowedRoutes:
        namespaces:
          from: Same
```

**Example: HTTPRoute (replaces Ingress)**

```yaml
# HTTPRoute (replaces Ingress for agency-app)
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: agency-app-route
  namespace: production
spec:
  parentRefs:
    - name: production-gateway
  hostnames:
    - "*.lukzen-op.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: agency-app
          port: 80
          weight: 100
```

**Advanced Features with Gateway API:**

```yaml
# Blue-Green Deployment with Weighted Traffic
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: backend-service-canary
  namespace: production
spec:
  parentRefs:
    - name: production-gateway
  hostnames:
    - "api.lukzen-op.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api/v1
      backendRefs:
        - name: backend-service-stable
          port: 3000
          weight: 90  # 90% to stable
        - name: backend-service-canary
          port: 3000
          weight: 10  # 10% to canary
```

**Migration Checklist:**

- [ ] Review Gateway API documentation (https://gateway-api.sigs.k8s.io/)
- [ ] Install Gateway API CRDs in ACK cluster
- [ ] Install Alibaba Cloud ALB Gateway Controller
- [ ] Create Gateway resource
- [ ] Convert Ingress manifests to HTTPRoute resources (agency-app, backend-service, backoffice-app)
- [ ] Test Gateway API routing with staging environment
- [ ] Migrate production traffic to Gateway API (blue-green cutover)
- [ ] Monitor for 1 week
- [ ] Remove Nginx Ingress Controller
- [ ] Update all documentation references

**Cost Impact:** $0 (Gateway API uses existing Alibaba Cloud ALB)
**Downtime:** Zero (blue-green migration strategy)
**Timeline:** 1-2 weeks (Week 7 of Phase 4)

**References:**
- Gateway API: https://gateway-api.sigs.k8s.io/
- Alibaba Cloud ALB Controller: https://www.alibabacloud.com/help/en/ack/ack-managed-and-ack-dedicated/user-guide/use-the-alb-ingress-controller-to-configure-gateway-api

---

#### Alibaba Container Registry Credentials

```bash
# scripts/create-acr-secret.sh
#!/bin/bash

NAMESPACE="production"
SECRET_NAME="acr-credentials"

# Get ACR credentials from Alibaba Cloud
ACR_USERNAME=$(aliyun cr GetAuthorizationToken --region na-south-1 --query 'authorizationToken' --output text | base64 -d | cut -d: -f1)
ACR_PASSWORD=$(aliyun cr GetAuthorizationToken --region na-south-1 --query 'authorizationToken' --output text | base64 -d | cut -d: -f2)

# Create Kubernetes secret
kubectl create secret docker-registry ${SECRET_NAME} \
  --namespace=${NAMESPACE} \
  --docker-server=registry.na-south-1.aliyuncs.com \
  --docker-username=${ACR_USERNAME} \
  --docker-password=${ACR_PASSWORD} \
  --docker-email=admin@lukzen-op.com

echo "✅ ACR credentials secret created in namespace ${NAMESPACE}"
```

#### Deployment Strategy

**Blue-Green Deployment Pattern:**

```yaml
# k8s/deployment-strategies/blue-green.yaml
---
# Blue deployment (current production)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-service-blue
  namespace: production
  labels:
    app: backend-service
    version: blue
spec:
  replicas: 5
  selector:
    matchLabels:
      app: backend-service
      version: blue
  template:
    metadata:
      labels:
        app: backend-service
        version: blue
    spec:
      containers:
      - name: backend-service
        image: registry.na-south-1.aliyuncs.com/oneclick/backend-service:v1.0.0
        # ... rest of container spec
---
# Green deployment (new version)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-service-green
  namespace: production
  labels:
    app: backend-service
    version: green
spec:
  replicas: 5
  selector:
    matchLabels:
      app: backend-service
      version: green
  template:
    metadata:
      labels:
        app: backend-service
        version: green
    spec:
      containers:
      - name: backend-service
        image: registry.na-south-1.aliyuncs.com/oneclick/backend-service:v1.1.0
        # ... rest of container spec
---
# Service (switch between blue and green by changing selector)
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: production
spec:
  selector:
    app: backend-service
    version: blue  # Change to 'green' to switch traffic
  ports:
  - port: 80
    targetPort: 3000
```

**Canary Deployment with Flagger:**

```yaml
# k8s/deployment-strategies/canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: backend-service
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-service

  service:
    port: 80
    targetPort: 3000

  analysis:
    interval: 1m
    threshold: 10
    maxWeight: 50
    stepWeight: 10

    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m

    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m

    webhooks:
    - name: load-test
      url: http://flagger-loadtester/
      timeout: 5s
      metadata:
        cmd: "hey -z 1m -q 10 -c 2 http://backend-service-canary/"
```

---

## Cloud Provider Comparison (For Reference)

### Alibaba Cloud vs AWS vs GCP vs Azure

| Feature | Alibaba Cloud (Primary) | AWS | GCP | Azure |
|---------|------------------------|-----|-----|-------|
| **Kubernetes** | ACK (Container Service) | EKS | GKE Autopilot | AKS |
| **Multi-AZ Support** | ✅ 3 AZs in na-south-1 | ✅ 3+ AZs per region | ✅ 3+ zones | ✅ 3+ zones |
| **Managed MongoDB** | ApsaraDB for MongoDB | DocumentDB | Atlas (3rd party) | Cosmos DB (partial compatibility) |
| **Managed Redis** | ApsaraDB for Redis | ElastiCache | Memorystore | Azure Cache |
| **cert-manager Support** | ✅ DNS-01 via Alibaba DNS | ✅ DNS-01 via Route53 | ✅ DNS-01 via Cloud DNS | ✅ DNS-01 via Azure DNS |
| **external-dns Support** | ✅ Native plugin | ✅ Native plugin | ✅ Native plugin | ✅ Native plugin |
| **Monitoring** | ARMS + CloudMonitor | CloudWatch + X-Ray | Cloud Monitoring | Azure Monitor |
| **Logging** | SLS (Simple Log Service) | CloudWatch Logs | Cloud Logging | Azure Log Analytics |
| **Backup** | OSS + Velero | S3 + Velero | GCS + Velero | Azure Blob + Velero |
| **SSL Certificates** | cert-manager + Let's Encrypt | ACM or cert-manager | Google-managed or cert-manager | Azure Certificates or cert-manager |
| **Cost (monthly)** | $2,000-3,500 | $2,500-4,500 | $2,200-3,800 | $2,400-4,000 |
| **LATAM Presence** | ✅ São Paulo | ✅ São Paulo | ✅ São Paulo | ❌ Limited |

**Recommendation:** Continue with **Alibaba Cloud** for LATAM focus and cost efficiency.

**If migrating later:** **GCP** offers best value and Kubernetes experience, but migration cost (~$20,000-30,000) not justified unless expanding to North America/Europe.

---

## Implementation Roadmap

**Timeline:** Launch by **End of February 2025** (2-3 travel agencies)
**Strategy:** MVP for launch + iterative 2-week sprints post-launch

---

## 🚀 PRE-LAUNCH: CRITICAL MVP (10 weeks - Complete by Feb 28, 2025)

**Scope:** Minimum viable infrastructure for 2-3 travel agencies with acceptable reliability

### WEEK 1: CRITICAL SECURITY (IMMEDIATE - NON-NEGOTIABLE)

**Day 1-2:**
- [ ] 🚨 **CRITICAL**: Revoke compromised Alibaba Cloud credentials
- [ ] Generate new access keys with limited RAM permissions
- [ ] Remove terraform.tfvars from repository (git-filter-repo)
- [ ] Add .env to .gitignore
- [ ] Create .env.example with placeholders

**Day 3-5:**
- [ ] Migrate all credentials to environment variables
- [ ] Set up Alibaba RAM Secret Manager for production secrets
- [ ] Update Terraform to use environment variables
- [ ] Enable MFA on all Alibaba Cloud accounts
- [ ] Implement least-privilege RAM policies

**Cost Impact:** ~$20/month
**Status:** 🔴 BLOCKING - Cannot launch without this

---

### WEEK 2-3: BASIC HIGH AVAILABILITY (2 AZs - Sufficient for MVP)

**Week 2:**
- [ ] Design **2-AZ** VPC architecture (na-south-1a, na-south-1b)
- [ ] Create 2 vSwitches (one per AZ)
- [ ] Create NAT gateways for each AZ
- [ ] Upgrade ACK to Professional Edition
- [ ] Create system node pool (2 nodes, one per AZ)
- [ ] Create application node pool (4 nodes, 2 per AZ)

**Week 3:**
- [ ] Deploy all applications to 2-AZ cluster
- [ ] Configure pod anti-affinity (spread across AZs)
- [ ] Implement basic pod disruption budgets (minAvailable: 1)
- [ ] Test AZ failover (shut down one AZ, verify services continue)
- [ ] Document basic HA setup

**Cost Impact:** +$400-500/month (6 nodes total vs 1 currently)
**Status:** 🟡 IMPORTANT - Acceptable for 2-3 agencies, upgrade to 3-AZ post-launch

---

### WEEK 4: MANAGED DATABASE (NON-NEGOTIABLE)

**Week 4:**
- [ ] Provision ApsaraDB for MongoDB (2-node replica set - sufficient for MVP)
- [ ] Configure automated daily backups (2 AM)
- [ ] Migrate databases from self-managed to ApsaraDB
- [ ] Test backup/restore procedures (document RTO/RPO)
- [ ] Update application connection strings
- [ ] Verify replication and failover

**Cost Impact:** +$300-400/month (2-node vs 3-node)
**Status:** 🟡 IMPORTANT - 2-node acceptable for MVP, upgrade to 3-node post-launch

---

### WEEK 5: CORE DEPLOYMENTS & INGRESS

**Week 5:**
- [ ] Deploy agency-app (2 replicas per AZ = 4 total)
- [ ] Deploy backend-service (2 replicas per AZ = 4 total)
- [ ] Deploy backoffice-app (1 replica per AZ = 2 total)
- [ ] Install Nginx Ingress Controller
- [ ] Configure basic Ingress rules (manual SSL for now)
- [ ] Test all three applications end-to-end

**Cost Impact:** Included in ACK costs
**Status:** 🔴 BLOCKING - Core functionality

---

### WEEK 6: SSL/DNS BASICS (MANUAL ACCEPTABLE FOR LAUNCH)

**Week 6:**
- [ ] Purchase/configure wildcard SSL certificate (*.lukzen-op.com)
- [ ] Configure manual DNS records for 2-3 agencies
- [ ] Set up SSL in Ingress (manual certificate)
- [ ] Test HTTPS for all agencies
- [ ] Document DNS/SSL manual process
- [ ] **OPTIONAL**: If time permits, install cert-manager (defer automation to post-launch)

**Cost Impact:** ~$50-100/year (SSL certificate if not using Let's Encrypt)
**Status:** 🟡 IMPORTANT - Manual acceptable for 2-3 agencies

---

### WEEK 7: BASIC MONITORING (ESSENTIAL FOR OPERATIONS)

**Week 7:**
- [ ] Enable ARMS basic monitoring (cluster-level)
- [ ] Configure critical alerts only:
  - Node down
  - Pod crash loops
  - High CPU/Memory (>90%)
  - Database connection failures
- [ ] Set up alert notifications (email/SMS)
- [ ] Create basic monitoring dashboard (1-2 dashboards)

**Cost Impact:** +$40-60/month (basic ARMS)
**Status:** 🟡 IMPORTANT - Needed for operational awareness

---

### WEEK 8: BACKUP & DISASTER RECOVERY (BASIC)

**Week 8:**
- [ ] Create OSS bucket for Velero backups
- [ ] Install Velero in ACK cluster
- [ ] Configure daily cluster backup (2 AM)
- [ ] Test one backup restoration
- [ ] Document basic DR procedures (RTO: 4 hours, RPO: 24 hours acceptable for MVP)

**Cost Impact:** +$3-5/month
**Status:** 🟡 IMPORTANT - Basic DR coverage

---

### WEEK 9: APPLICATION CODE IMPROVEMENTS (CRITICAL BUGS ONLY)

**Week 9:**
- [ ] Fix hardcoded credentials in application code
- [ ] Implement basic error handling (AppError class)
- [ ] Add basic logging (Winston with structured logs)
- [ ] Implement httpOnly cookies for authentication
- [ ] Add input validation with Zod (critical endpoints only)

**Cost Impact:** $0 (code changes only)
**Status:** 🔴 BLOCKING - Security and reliability

---

### WEEK 10: TESTING & LAUNCH PREPARATION

**Week 10:**
- [ ] End-to-end testing with 2-3 test tenants
- [ ] Load testing (simulate 50-100 concurrent users)
- [ ] Security review (basic penetration testing)
- [ ] Create runbooks for common operations
- [ ] Train team on basic ops (deployments, monitoring, backups)
- [ ] **GO/NO-GO DECISION**

**Cost Impact:** $0
**Status:** 🔴 BLOCKING - Launch readiness

---

### PRE-LAUNCH TOTAL COST

| Component | Monthly Cost (USD) |
|-----------|-------------------|
| **ACK Professional (6 nodes, 2 AZs)** | $500-700 |
| **ApsaraDB MongoDB (2-node replica)** | $300-400 |
| **ARMS Basic Monitoring** | $40-60 |
| **OSS (backups, terraform state)** | $5-10 |
| **Load Balancer (SLB)** | $25-50 |
| **NAT Gateways (2x)** | $50-100 |
| **DNS + SSL** | $10-20 |
| **RAM Secret Manager** | $20-30 |
| **TOTAL MONTHLY (MVP)** | **$950-1,370** |

**Launch Decision:** If all Week 1-10 items complete: ✅ **LAUNCH**

---

## 🔄 POST-LAUNCH: ITERATIVE 2-WEEK SPRINTS

**Strategy:** Continuous improvement after launch via 2-week sprints

### SPRINT 1 (Weeks 11-12): SSL/DNS AUTOMATION

**Priority:** HIGH - Reduce manual toil
- [ ] Install cert-manager with Let's Encrypt
- [ ] Automate SSL certificate issuance/renewal
- [ ] Install external-dns for automatic DNS management
- [ ] Migrate manual certificates to automated
- [ ] Remove manual SSL/DNS processes

**Cost Impact:** -$50-100/year (eliminate manual SSL), +$1/month (DNS queries)
**Benefit:** Zero-touch SSL/DNS management

---

### SPRINT 2 (Weeks 13-14): UPGRADE TO 3-AZ

**Priority:** MEDIUM - Improve availability SLA
- [ ] Add third AZ (na-south-1c)
- [ ] Create third vSwitch and NAT gateway
- [ ] Scale node pools to 3 AZs (9 nodes total)
- [ ] Upgrade MongoDB to 3-node replica set
- [ ] Test 3-AZ failover scenarios

**Cost Impact:** +$300-400/month
**Benefit:** 99.95% → 99.99% availability SLA

---

### SPRINT 3 (Weeks 15-16): ADVANCED OBSERVABILITY

**Priority:** MEDIUM - Better operational insights
- [ ] Deploy Grafana workspace
- [ ] Create comprehensive dashboards (10+ dashboards)
- [ ] Set up SLS centralized logging
- [ ] Configure log-based alerts (error rate, latency)
- [ ] Implement distributed tracing (optional)

**Cost Impact:** +$80-140/month (ARMS Pro + SLS)
**Benefit:** Full observability stack

---

### SPRINT 4 (Weeks 17-18): SECURITY HARDENING

**Priority:** MEDIUM-HIGH - Compliance preparation
- [ ] Implement Kubernetes Network Policies (deny-all default)
- [ ] Configure pod security standards (baseline/restricted)
- [ ] Enable Alibaba Cloud WAF (basic plan)
- [ ] Restrict security groups (remove 0.0.0.0/0)
- [ ] Security audit and penetration testing

**Cost Impact:** +$100-200/month (WAF)
**Benefit:** Defense in depth, compliance-ready

---

### SPRINT 5 (Weeks 19-20): REDIS CACHING

**Priority:** MEDIUM - Performance optimization
- [ ] Provision ApsaraDB for Redis (2GB master-replica)
- [ ] Implement caching layer in backend-service
- [ ] Cache hotel data (TTL: 1 hour)
- [ ] Cache tenant configurations (in-memory + Redis)
- [ ] Performance benchmarking

**Cost Impact:** +$80-120/month
**Benefit:** 3-5x faster API responses, reduced database load

---

### SPRINT 6 (Weeks 21-22): TESTING IMPROVEMENTS

**Priority:** HIGH - Code quality and CI/CD
- [ ] Achieve 70% test coverage (backend-service)
- [ ] Achieve 50% test coverage (frontends)
- [ ] Set up CI/CD pipeline (Alibaba Cloud CodePipeline or GitHub Actions)
- [ ] Automate deployments (blue-green strategy)
- [ ] Implement automated testing in CI

**Cost Impact:** $0-50/month (CI/CD if using external service)
**Benefit:** Faster, safer deployments

---

### SPRINT 7 (Weeks 23-24): GATEWAY API MIGRATION

**Priority:** LOW-MEDIUM - Future-proofing
- [ ] Install Gateway API CRDs
- [ ] Install Alibaba Cloud ALB Gateway Controller
- [ ] Convert Ingress resources to HTTPRoute
- [ ] Test Gateway API routing
- [ ] Blue-green migration from Nginx Ingress
- [ ] Remove Nginx Ingress Controller

**Cost Impact:** $0 (uses existing ALB)
**Benefit:** Modern traffic management, advanced routing capabilities

---

### SPRINT 8 (Weeks 25-26): COST OPTIMIZATION

**Priority:** MEDIUM - Reduce operational costs
- [ ] Implement spot instances for non-critical workloads
- [ ] Configure reserved instances for stable workloads
- [ ] Set up cost monitoring and budgets (CloudMonitor)
- [ ] Review and optimize resource allocations
- [ ] Implement auto-scaling based on actual usage

**Cost Impact:** -$200-400/month (estimated savings)
**Benefit:** 15-30% cost reduction

---

### SPRINT 9+ (Ongoing): BACKLOG ITEMS

**Pick from backlog based on business needs:**
- [ ] Multi-region deployment (disaster recovery in another region)
- [ ] Advanced caching strategies (CDN for static assets)
- [ ] Database read replicas for analytics
- [ ] Advanced security (SIEM integration, anomaly detection)
- [ ] Performance optimization (query optimization, indexing)
- [ ] Advanced testing (chaos engineering, load testing automation)
- [ ] Compliance certifications (SOC 2, ISO 27001)

---

## LAUNCH CRITERIA (End of February 2025)

**MUST HAVE (Non-Negotiable):**
- ✅ All credentials secured (no hardcoded secrets)
- ✅ 2-AZ deployment with basic HA
- ✅ Managed database (ApsaraDB MongoDB)
- ✅ Basic monitoring and alerting (ARMS)
- ✅ Basic backup and disaster recovery (Velero)
- ✅ SSL/HTTPS working (manual acceptable)
- ✅ All 3 applications deployed and tested
- ✅ 2-3 test agencies onboarded successfully
- ✅ Basic runbooks and documentation

**NICE TO HAVE (Can Defer to Post-Launch):**
- ⏳ 3-AZ deployment (upgrade in Sprint 2)
- ⏳ Automated SSL/DNS (implement in Sprint 1)
- ⏳ Advanced observability (implement in Sprint 3)
- ⏳ WAF and advanced security (implement in Sprint 4)
- ⏳ Redis caching (implement in Sprint 5)
- ⏳ Gateway API (implement in Sprint 7)

**Monthly Cost at Launch:** $950-1,370 (scales to $1,800-2,500 after post-launch improvements)

---

## Total Cost Summary

### Current Monthly Cost (Estimated)
- ACK (1 node): ~$150
- Self-managed MongoDB (in ACK): ~$50 (node resources)
- Manual SSL management: $0
- No monitoring: $0
- **TOTAL:** ~$200/month

### MVP Launch Cost (Feb 2025 - 2-3 agencies)

| Component | Cost (USD/month) |
|-----------|-----------------|
| **ACK Professional (6 nodes, 2 AZs)** | $500-700 |
| **ApsaraDB for MongoDB (2-node replica)** | $300-400 |
| **ARMS Basic Monitoring** | $40-60 |
| **OSS (Backups + Terraform state)** | $5-10 |
| **Load Balancer (SLB)** | $25-50 |
| **DNS + SSL (manual)** | $10-20 |
| **NAT Gateways (2x)** | $50-100 |
| **RAM Secret Manager** | $20-30 |
| **TOTAL MONTHLY (MVP)** | **$950-1,370** |

### Full Production Cost (After Post-Launch Sprints)

| Component | Cost (USD/month) |
|-----------|-----------------|
| **ACK Professional (9 nodes, 3 AZs)** | $700-1,100 |
| **ApsaraDB for MongoDB (3-node replica)** | $400-500 |
| **ApsaraDB for Redis (2 GB master-replica)** | $80-120 |
| **ARMS Pro + Grafana** | $80-120 |
| **SLS (Centralized logging)** | $40-80 |
| **OSS (Backups + Terraform state)** | $5-10 |
| **Alibaba Cloud WAF** | $100-200 |
| **Load Balancer (SLB)** | $25-50 |
| **DNS (automated with external-dns)** | $1-5 |
| **cert-manager + Let's Encrypt** | $0 |
| **NAT Gateways (3x)** | $75-150 |
| **CloudMonitor Alerts** | $10-20 |
| **RAM/KMS (Secret Manager)** | $20-40 |
| **TOTAL MONTHLY (FULL)** | **$1,536-2,395** |

### One-Time Implementation Costs

**Pre-Launch (10 weeks):**
- Development/DevOps effort: ~$20,000-30,000
- Git history cleanup (BFG): ~$500
- Basic security audit: ~$2,000
- Training: ~$1,000
- **TOTAL ONE-TIME (PRE-LAUNCH):** ~$23,500-33,500

**Post-Launch (Ongoing Sprints):**
- Continuous improvement (per sprint): ~$5,000-8,000 per 2-week sprint
- Estimated 8 sprints (16 weeks): ~$40,000-64,000
- **TOTAL POST-LAUNCH:** ~$40,000-64,000

### Cost-Benefit Analysis

| Scenario | Monthly Cost | Availability | Recovery Time | Operational Overhead |
|----------|-------------|--------------|---------------|---------------------|
| **Current** | $200 | ~95% (no SLA) | Unknown | High (manual everything) |
| **MVP Launch** | $950-1,370 | 99.9% (2-AZ) | RTO: 4h, RPO: 24h | Medium (some manual) |
| **Full Production** | $1,536-2,395 | 99.95% (3-AZ) | RTO: 15min, RPO: 1h | Low (fully automated) |

**ROI at Launch:** MVP costs ~$750-1,170/month more than current but provides:
- 99.9% availability vs ~95% (10x improvement in uptime)
- Managed database with automated backups
- Basic monitoring and alerting (MTTR reduction)
- Security compliance (no hardcoded credentials)
- Supports 2-3 travel agencies with acceptable reliability

**Break-even:** If service downtime costs >$300/hour or enables onboarding 2-3 paying agencies, MVP infrastructure pays for itself immediately.

---

## Success Metrics

### Current State (Pre-Implementation)
- Availability: ~95% (no SLA)
- MTTR: Unknown (no monitoring)
- MTTD: Unknown (no alerting)
- Backup Recovery: Untested
- SSL Renewal: Manual
- DNS Updates: Manual
- Security: 🚨 CRITICAL vulnerability (hardcoded creds)
- Agencies Supported: 0 (not ready)

### MVP Launch (End of February 2025)
- Availability: 99.9% (2-AZ deployment)
- MTTR: <2 hours
- MTTD: <15 minutes (basic ARMS alerting)
- Backup Recovery: Tested weekly, RTO: 4 hours, RPO: 24 hours
- SSL Renewal: Manual (acceptable for 2-3 agencies)
- DNS Updates: Manual (acceptable for 2-3 agencies)
- Security: ✅ Compliant (credentials secured)
- Agencies Supported: 2-3 (with acceptable reliability)

### Full Production (After Post-Launch Sprints)
- Availability: 99.95% (3-AZ deployment, SLA-backed)
- MTTR: <15 minutes
- MTTD: <5 minutes (automated alerting)
- Backup Recovery: Tested monthly, RTO: <1 hour, RPO: 1 hour
- SSL Renewal: Automated (45 days before expiry)
- DNS Updates: Automated (on deployment)
- Security: Compliant (SOC 2, ISO 27001 ready, WAF enabled)
- Agencies Supported: 10+ (enterprise-grade reliability)

---

## Conclusion

The alibaba-infra repository has a solid Terraform foundation but requires **immediate security fixes** and **phased enhancements** for production readiness.

### MVP LAUNCH STRATEGY (10 weeks - End of February 2025)

**CRITICAL PATH (Non-Negotiable):**
1. 🚨 **Fix hardcoded credentials** (Week 1 - IMMEDIATE)
2. **2-AZ deployment** (Weeks 2-3)
3. **Managed database** (Week 4)
4. **Core deployments** (Week 5)
5. **Basic SSL/DNS** (Week 6 - manual acceptable)
6. **Basic monitoring** (Week 7)
7. **Basic backup/DR** (Week 8)
8. **Code improvements** (Week 9)
9. **Testing & launch prep** (Week 10)

**Launch Criteria:** Support 2-3 travel agencies with 99.9% availability

**MVP Cost:** $950-1,370/month (vs current $200/month)
**Pre-Launch Implementation:** ~$23,500-33,500 (one-time)

### POST-LAUNCH STRATEGY (Iterative 2-Week Sprints)

**Continuous Improvement:**
- Sprint 1: SSL/DNS automation
- Sprint 2: Upgrade to 3-AZ
- Sprint 3: Advanced observability
- Sprint 4: Security hardening (WAF, Network Policies)
- Sprint 5: Redis caching
- Sprint 6: Testing improvements & CI/CD
- Sprint 7: Gateway API migration
- Sprint 8: Cost optimization

**Full Production Cost:** $1,536-2,395/month
**Post-Launch Implementation:** ~$40,000-64,000 (8 sprints)

### CLOUD PROVIDER RECOMMENDATION

Continue with **Alibaba Cloud** for:
- ✅ Strong LATAM presence (São Paulo region)
- ✅ Cost efficiency (20-30% cheaper than AWS/GCP)
- ✅ Excellent Kubernetes support (ACK)
- ✅ Comprehensive managed services

Migration to AWS/GCP **not recommended** unless expanding to North America/Europe markets (migration cost: $20,000-30,000).

### NEXT STEPS

**Immediate (Week 1):**
1. Execute Week 1 security fixes (revoke credentials, migrate to env vars)
2. Allocate $950-1,370/month budget for MVP infrastructure
3. Assign dedicated DevOps resource (full-time for 10 weeks)

**Pre-Launch (Weeks 2-10):**
4. Follow 10-week critical path roadmap
5. Weekly progress reviews and go/no-go checkpoints
6. Launch decision at end of Week 10

**Post-Launch (Weeks 11+):**
7. Execute 2-week sprints based on business priorities
8. Continuous improvement and optimization
9. Scale infrastructure as agencies onboard