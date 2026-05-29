# Dingus

Hotel GDS aggregating multiple sub-vendors under a single OTA-style feed.

| Field | Value |
| --- | --- |
| **Type** | Hotel GDS |
| **Protocol** | SOAP / OTA XML |
| **Auth** | Static credentials per sub-vendor |
| **Status** | Shipped — catalog sync + booking flow live |
| **Adapter** | `backend-service/src/shared/adapters/dingus/` |
| **Integration guide** | [dingus-integration-guide.md](./dingus-integration-guide.md) |

## Vendor documentation

- Dingus partner portal + spec library (Google Drive): https://drive.google.com/drive/u/0/folders/1CJQnu761VX_uYHGiSfw8wBuhuNEoFcE5?ths=true

## Notes

Dingus exposes a multi-vendor sub-feed model — see §7 of the integration guide for how the catalog is partitioned per sub-vendor and how booking routing decides which sub-feed serves each request.
