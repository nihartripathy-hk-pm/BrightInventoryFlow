
# Product Requirements Document (PRD): Liquidation Control Center (LCC)

**Version:** 1.0 (Initial Release)  
**Status:** Draft  
**Stakeholders:** Supply Chain Management, Logistics, Inventory Planning

---

## 1. Executive Summary
The **Liquidation Control Center (LCC)** is a centralized decision-support and configuration platform designed to optimize the liquidation of near-expiry and slow-moving inventory. It provides a multi-tiered rule engine that governs how, when, and where inventory is transferred for liquidation, minimizing waste and maximizing recovery value through algorithmic and manual overrides.

---

## 2. Problem Statement
Managing liquidation at scale involves complex trade-offs between shelf life, logistics costs, and product classifications. Manual management leads to:
- High wastage due to missed expiry windows.
- Inefficient inventory transfers (shipping low-value loads).
- Inconsistent liquidation rules across different brands and categories.
- Lack of audit trails for bulk liquidation decisions.

---

## 3. Goals & Objectives
- **Inventory Recovery:** Maximize the liquidation of stock before it reaches zero-value status.
- **Logistical Efficiency:** Enforce minimum "viable load" thresholds to ensure transfers are financially sensible.
- **Granular Control:** Provide a hierarchy of overrides (SKU > Brand > Global) for shelf-life and transfer logic.
- **Process Integrity:** Implement a "Draft vs. Commit" workflow to ensure configurations are reviewed before deployment.

---

## 4. User Personas

### 4.1. Inventory Planner
- **Need:** To set global and category-specific shelf-life thresholds.
- **Pain Point:** Hard-coded system logic that doesn't account for seasonality or specific brand requirements.

### 4.2. Warehouse Operations Manager
- **Need:** To designate specific warehouses as "Sinks" and monitor pending transfers.
- **Pain Point:** Overflowing inventory in primary fulfillment centers without a clear path to liquidation centers.

---

## 5. Success Metrics (Global)
- **Reduction in Expiry Waste:** % decrease in expired stock write-offs.
- **Average Payload Value:** Higher COGS/Weight per liquidation transfer.
- **Configuration Speed:** Reduced time to update rules across thousands of SKUs via tier-based overrides.

---

## 6. Feature: Warehouse Setup

### 6.1 Feature Overview
- **Target Users:** Warehouse Operations Managers, Logistics Managers
- **Purpose:** Provides a streamlined interface for configuring the logistical destination of all liquidated inventory within the network. It allows operations managers to explicitly designate a single facility as the "Master Sink," ensuring all algorithmic and manual liquidation transfers are routed to the correct destination.

### 6.2 Problem Addressed
In a multi-node fulfillment network, liquidated stock must be consolidated into specific clearance centers to avoid clogging primary fulfillment centers (donors). Without a clear, system-enforced "Sink" destination:
- Liquidated inventory may be transferred to the wrong facilities.
- The system lacks a definitive endpoint for calculating transfer thresholds (distance/cost).
- Facilities might accidentally be configured to both send and receive liquidated stock (circular transfers).

### 6.3 Functional Requirements
- **FR1.1 Warehouse Listing:** The system shall display a list or grid of all active warehouses in the network.
- **FR1.2 Metadata Visibility:** Each warehouse card shall display critical metadata including Warehouse ID / Location Name and Current Role (Donor vs. Master Sink).
- **FR2.1 Master Sink Assignment:** Users shall be able to designate exactly one (1) warehouse as the active "Master Sink."
- **FR2.2 Search & Assign:** To change or assign a warehouse as ‘Master Sink’, users should be able to search for a warehouse and assign it.
- **FR2.3 Singularity Enforcement:** The system must enforce that only a single Master Sink can exist at any given time. Selecting a new Master Sink automatically deselects the previous one.
- **FR3.1 Conflict Resolution:** When a warehouse is designated as the Master Sink, its capability to act as a "Donor" must be disabled. This prevents the liquidation center from algorithmically shipping stock back to itself.
- **FR3.2 Visual Distinction:** The UI shall visually distinguish the Master Sink from standard Donor warehouses (e.g., highlighting, specific badging).

### 6.4 User Interface Guidelines
- **Layout:** Grid-based layout displaying warehouse cards.
- **Interactivity:** One-click selection to make a warehouse the Master Sink.
- **Visual Feedback:** The selected Master Sink should have a prominent visual indicator.
- **Messaging:** Clear helper text explaining the consequences (e.g., "All liquidated inventory across the network will be routed to this facility.").

---

## 7. Feature: Donor Network & Pair Overrides

### 7.1 Purpose
Provides granular control over where liquidated inventory originates (Donor Network) and how it is routed to specific destinations (Pair Overrides), bypassing global defaults when necessary.

### 7.2 Problem Statement
Global rules fail to account for regional logistical constraints, local liquidation capabilities, or high freight costs that exceed recovery value.

### 7.3 Functional Requirements
- **FR1.1 Participation Toggle:** The system shall allow users to enable or disable individual warehouses as "Donors."
- **FR1.2 Exclusion Logic:** Disabled (Bypassed) nodes shall be invisible to the algorithmic engine.
- **FR1.3 System Safeguards:** The current "Master Sink" shall be automatically protected from acting as a donor.
- **FR2.1 Route Hijacking:** Users shall be able to override the "Master Sink" destination on a per-donor basis.
- **FR2.2 Precedence Definition:** - If Pair Override exists -> Route to Custom Sink.
    - If No Override exists -> Route to Global Master Sink.
- **FR2.3 Dynamic Validation:** The Sink selection dropdown for a donor must exclude the donor itself.
- **FR3.1 Logic Source Badging:** Visually distinguish between "System Default" (Global) and "Route Pair" (Override).
- **FR3.2 Real-time Status:** The "Donor" list must provide immediate visual feedback on "Participating" vs. "Excluded" status.

### 7.4 User Interface Guidelines
- **Donor Network Tab:** A tabular view listing all warehouses and participation toggles.
- **Pair Overrides Tab:** A routing matrix showing Source Node, Directional Indicator (arrow), and searchable Destination Selection.

---

## 8. Success Metrics (Features)
- **Logistical Cost Reduction:** Decrease in average freight distance for liquidation transfers through localized route pairs.
- **Operational Precision:** Zero instances of circular transfers from Sinks back into the network.
- **Audit Accuracy:** Clear visibility on why a specific route was chosen (Global vs. Pair Override).
- **Configuration Speed:** Time taken for a logistics manager to re-route inventory during an operational shift.
- **Error Reduction:** Elimination of manual entry errors through searchable dropdowns and system-enforced constraints.
"""

