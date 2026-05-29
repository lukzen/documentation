# Juniper

Juniper is the **XML protocol** underlying multiple booking-engine products. At Ergos we currently reach Juniper through the **Roibos** adapter — Roibos is a vendor product built on top of Juniper's API.

| Field | Value |
| --- | --- |
| **Type** | Hotel GDS protocol (consumed via Roibos) |
| **Protocol** | SOAP / Juniper XML |
| **Auth** | Cert-based + credentials per partner |
| **Status** | Shipped via Roibos adapter |
| **Adapter** | `backend-service/src/shared/adapters/roibos/` |
| **Integration guide** | [juniper-integration-guide.md](./juniper-integration-guide.md) |

## Vendor documentation

- Juniper Hotel API reference: https://api-edocs.ejuniper.com/en/api/jp/hotel-api

## Notes

There is **no standalone `juniper` adapter**. If a new Juniper-based vendor needs to be onboarded, follow §7 of the integration guide ("Adding a new Juniper-based vendor") — the recommended approach is to subclass or copy the Roibos adapter, not build a generic Juniper one.
