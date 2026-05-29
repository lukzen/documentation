# Hotetec

Hotel GDS with a REST/JSON surface and a session-token auth model.

| Field | Value |
| --- | --- |
| **Type** | Hotel GDS |
| **Protocol** | REST / JSON |
| **Auth** | Session token (acquired via login, refreshed on expiry) |
| **Status** | Shipped — catalog sync + booking flow live |
| **Adapter** | `backend-service/src/shared/adapters/hotetec/` |
| **Integration guide** | [hotetec-integration-guide.md](./hotetec-integration-guide.md) |

## Vendor documentation

- Hotetec support knowledge base: https://support.hotetec.com/en/support/solutions/articles/80001041613-availability-hotel

## Notes

Session lifecycle is non-trivial (login, token TTL, re-auth on 401) — see §7 of the integration guide. The adapter wraps the session manager so callers do not need to think about token state.
