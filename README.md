# Ergos Continental — Public Documentation

**Public-facing materials only**: interactive prototypes, bilingual business-case
guides, commission/markup walkthroughs, and the user guide. Served via
GitHub Pages at **[lukzen.github.io/documentation](https://lukzen.github.io/documentation/)**.

> ## 🔒 Internal documentation moved
>
> Architecture decisions (ADRs), production-readiness assessments,
> integration guides, onboarding docs, business plans, bug repros, and
> in-flight user stories now live in the **private** repo
> **[lukzen/technical-docs](https://github.com/lukzen/technical-docs)**.
>
> If you're a team member and can't see that repo, ping an org owner
> for access. External readers won't have access — by design.

---

## What's in THIS repo

```
documentation/
  public/
    index.html              GitHub Pages landing
    business-cases/         Bilingual (EN+ES) pricing & markup walkthroughs
    prototypes/             Interactive HTML prototypes for the agency app
    commission-screenshots/ Reference screenshots for the commission cascade
    user-guide/             End-customer user-guide screenshots
  README.md                 This file
  .github/                  Pages deployment workflow + templates
  .gitignore                Standard ignores + local-only scratch areas
```

Local-only directories (gitignored — not in the repo, used by the
documentation maintainer locally):

```
  bugs/                     bug repros, intentionally private
  _user_stories_pending/    drafts in flight
  business-plan/ergos-financial-projections.html
  TODO.txt                  working list
```

---

## Public business cases (bilingual EN + ES)

Best viewed via the deployed Pages site:
**[lukzen.github.io/documentation](https://lukzen.github.io/documentation/)**.
Each file also renders correctly from the GitHub browse view.

| Document | Description |
|---|---|
| [How Agencies Configure Markup](public/business-cases/agency-markup-guide.html) | Agency-side 4-tier markup cascade (Brand · Country · Category · Hotel). Markup Rules editor, cascade preview, backoffice audit drilldown, booking-time snapshot. 4 screenshots. |
| [Pricing Policy & Hotel Brands](public/business-cases/pricing-policy-guide.html) | Ergos-side 5-layer commission cascade. The `markup_rules` collection, booking snapshot, money flow across all 4 parties, worked-number scenarios. |

---

## Interactive prototypes

Live HTML/JS prototypes of the agency app. Open `public/prototypes/agency-app/index.html`
in a browser, or serve the folder locally:

```bash
cd public/prototypes/agency-app
npx serve            # or: python -m http.server
```

---

## Related repositories

| Repository | Visibility | Purpose |
|---|---|---|
| **[lukzen/technical-docs](https://github.com/lukzen/technical-docs)** | 🔒 Private | ADRs, architecture, production readiness, integration guides, business plans |
| [lukzen/backend-service](https://github.com/lukzen/backend-service) | (per repo) | Express API server — GDS adapters, booking engine, API key management |
| [lukzen/agency-app](https://github.com/lukzen/agency-app) | (per repo) | Travel agency booking portal (React SPA) |
| [lukzen/backoffice-app](https://github.com/lukzen/backoffice-app) | (per repo) | Internal admin dashboard (React SPA) |
| [lukzen/alibaba-infra](https://github.com/lukzen/alibaba-infra) | (per repo) | Terraform IaC for Alibaba Cloud infrastructure |
| [lukzen/oneclick-local-infra](https://github.com/lukzen/oneclick-local-infra) | 🔒 Private | Local Mac Minikube + ArgoCD GitOps for the platform |
