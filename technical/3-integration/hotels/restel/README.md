# Restel

Hotel GDS (Hotelbeds family) with a custom XML API and `lin` token auth.

| Field | Value |
| --- | --- |
| **Type** | Hotel GDS |
| **Protocol** | Custom XML over HTTP |
| **Auth** | `lin` token (per-session) plus user/agency identifiers |
| **Status** | In progress — adapter scaffolded, awaiting production credentials |
| **Adapter** | `backend-service/src/shared/adapters/restel/` |
| **Integration guide** | [restel-integration-guide.md](./restel-integration-guide.md) |

## Vendor documentation

- Restel API wiki: http://wiki.restelhotels.com/en/home

## Required env vars

- `RESTEL_USER` — primary user code
- `RESTEL_PASSWORD` — credential
- `RESTEL_CODUSU` — alternate user code (used by some endpoints)
- `RESTEL_AGENCY_NAME` — agency identifier passed in booking calls

See §7 of the integration guide for the full config matrix and how the `lin` token is acquired and refreshed.
