# Security policy

## Reporting a vulnerability

Please do not open a public issue for a vulnerability involving authentication, payment activation, private media, or audience access. Email the repository owner with a concise reproduction, impact, and affected route. We will acknowledge credible reports as quickly as possible.

## Security model

- Auth0 establishes the authenticated viewer.
- Stripe’s signed webhook establishes live payment completion.
- LaunchDay establishes ownership and named audience access.
- Vercel Blob stores media privately; the application authorizes every protected read.
- Secrets live only in environment variables.

## Deployment requirements

- Use Stripe test mode until the webhook and consent flow are independently verified.
- Use a private Vercel Blob store.
- Rotate provider secrets if they are ever copied into a log, issue, or commit.
- Configure exact HTTPS origins in Auth0—do not use overly broad callback or web-origin entries.
- Do not treat the demo fallback as a payment or identity security test.

LaunchDay is a hackathon MVP, not flight operations, medical, safety, or clearance software.
