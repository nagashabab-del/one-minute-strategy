This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Staging Review URL

For faster QA reviews with a stable URL (without opening a new preview domain each time), run:

```bash
npm run deploy:staging
```

Default alias:

```text
https://one-minute-strategy-saas-poc-staging.vercel.app
```

Optional custom alias:

```bash
bash scripts/deploy-staging.sh your-alias.vercel.app
```

## Release Gate Checklist

Before any production rollout, follow the documented gate and rollback plan:

- [docs/RELEASE_GATE_CHECKLIST.md](./docs/RELEASE_GATE_CHECKLIST.md)

## Authentication Configuration (Clerk)

Required environment variables:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
```

Production hardening rules in this project:

- Production rejects Clerk test keys (`pk_test_` / `sk_test_`) with `503`.
- Production rejects missing Clerk keys with `503`.
- UI auth widgets are disabled when a production test key is detected.

Local QA mode (development only):

```text
NEXT_PUBLIC_OMS_ALLOW_DEMO_MODE=true
```
