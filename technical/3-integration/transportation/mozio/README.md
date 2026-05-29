# Mozio

Ground-transportation provider (airport / city transfers) — **not** a hotel GDS. Used as an upsell after a hotel booking is confirmed.

| Field | Value |
| --- | --- |
| **Type** | Ground transportation |
| **Protocol** | REST / JSON, async polling model |
| **Auth** | API key |
| **Status** | Shipped in code; production exposure gated by an agency-app feature flag |
| **Client** | `backend-service/src/shared/integrations/mozio/` (custom `MozioClient`, not the `VendorAdapter` interface) |
| **Integration guide** | [mozio-integration-guide.md](./mozio-integration-guide.md) |
| **Prototype** | [/public/prototypes/agency-app/](../../../../public/prototypes/agency-app/) (served by GitHub Pages) |

## Vendor documentation

- Mozio API docs: https://docs.mozio.com/

## Notes

Mozio uses an async **search → poll → quote → book** pattern, not a synchronous availability call. The polling model and the custom client wrapper are the main differences from the hotel adapters — see §7 of the integration guide for the lifecycle and §8 for how the booking flow plugs into the agency-app upsell screen.
