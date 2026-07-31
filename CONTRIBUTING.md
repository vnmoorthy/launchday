# Contributing to LaunchDay

Thanks for helping make consent-first products easier to build.

## The non-negotiable

**Funding is never permission.** A contribution must not let a payer silently gain audience access, weaken passenger ownership, or expose private mission media.

## Local workflow

```bash
npm install
npm run dev
npm run lint
npm run build
```

The credential-free demo is the default development path. Add `.env.local` only when you are testing a live provider integration.

## Pull requests

- Keep the change focused and explain the user impact.
- Include a demo path or test note for anything touching consent, identities, payment, or private media.
- Never add secrets, personal mission data, or production customer records.
- Run lint and build before opening the pull request.

## Issues

Please lead with the real-world situation: who pays, who benefits, who should be allowed to see the experience, and what happens when consent changes. That keeps product discussions grounded in the core problem.

## Conduct

Be kind, specific, and security-conscious. Harassment, discrimination, or sharing another person’s private information is not welcome.
