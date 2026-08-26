<div align="center">

<img src="./public/images/ridge-ride-logo-lockup.png" alt="Ridge & Ride" width="280" />

# Ridge & Ride

### A production-minded mountain-bike commerce experience

Explore capable bikes, riding gear, apparel, workshops, and trail knowledge in one focused storefront.

<p>
  <a href="https://github.com/Saquib-Hazari/ridge-ride"><img src="https://img.shields.io/badge/Source-GitHub-111111?style=for-the-badge&logo=github" alt="Source code" /></a>
  <a href="https://www.linkedin.com/in/saquib-hazari/"><img src="https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin" alt="LinkedIn" /></a>
  <a href="https://x.com/Briviotech"><img src="https://img.shields.io/badge/Twitter%2FX-Follow-111111?style=for-the-badge&logo=x" alt="Twitter or X" /></a>
  <a href="https://www.behance.net/saquibhazari1"><img src="https://img.shields.io/badge/Behance-Portfolio-1769FF?style=for-the-badge&logo=behance" alt="Behance" /></a>
</p>

</div>

> Replace the placeholder social URLs above with the final project and creator profiles before publishing this repository.

## Overview

Ridge & Ride is a full-stack ecommerce website for riders who want more than a basic product grid. It combines a curated mountain-bike catalog with product detail pages, gear and apparel collections, editorial guides, workshop bookings, customer accounts, order history, an admin workspace, and Razorpay checkout.

The interface is editorial and outdoors-oriented: strong imagery, concise product information, useful buying guidance, and clear paths from discovery to purchase. The application is designed to run at the edge on Cloudflare while keeping sensitive operations on the server and customer data in Neon Postgres.

## The problem, solved with STAR

### Situation

Bike shoppers often move between disconnected experiences: one site for bikes, another for accessories, a separate workshop booking form, and scattered articles for understanding trail, enduro, or downhill riding. That fragmentation makes it difficult to choose the right bike and difficult for a specialist retailer to manage the complete customer journey.

### Task

Create a trustworthy, responsive storefront that helps riders discover the right category, understand products, purchase securely, book services, and manage their relationship with the store after checkout. The solution also needed a foundation for content publishing, customer support, email communication, inventory, and future payment webhooks.

### Action

Ridge & Ride brings those journeys into one application:

- A catalog for mountain bikes, parts, gear, and apparel.
- Product pages with imagery, specifications, reviews, FAQs, and related products.
- Editorial guides for trail, enduro, and downhill riding.
- Workshop and service-booking flows with persisted form submissions.
- Cart and server-created Razorpay orders.
- Customer dashboards with profile editing, avatar management, addresses, saved items, purchase history, and order history.
- An admin dashboard for operational metrics, orders, customers, inventory, and blog content.
- Transactional email hooks through Resend.
- SEO foundations including semantic headings, canonical URLs, metadata, sitemap, robots directives, and structured data.
- Responsive layouts designed for phones, tablets, laptops, and large displays.

### Result

The project provides a cohesive, brand-led shopping experience instead of disconnected pages. Server-side boundaries protect credentials and database access, the content structure supports organic discovery, and modular features make it possible to extend payments, fulfillment, inventory events, and customer communications without rebuilding the storefront.

## Product capabilities

### Customer experience

- Homepage with category discovery, featured bikes, editorial content, and service calls to action.
- Bike browsing with filtering and responsive product cards.
- Bike detail pages with imagery, facts, reviews, FAQs, and related recommendations.
- Parts, gear, and apparel collections.
- Trail, enduro, and downhill guides with long-form content and riding context.
- Cart with quantity visibility in the global header and persisted client-side cart state.
- Checkout flow integrated with Razorpay order creation.
- Custom branded sign-in and sign-up forms with Google sign-in through Clerk.
- Account dashboard for profile, avatar, address, wishlist, orders, and purchase-history visualization.
- 404 experience and user-facing error states matching the storefront.

### Store operations

- Admin dashboard with role-aware access.
- Product, order, customer, inventory, and blog administration surfaces.
- Persisted newsletter subscriptions, contact requests, and service bookings.
- Neon-backed customer profiles, addresses, orders, and catalog data.
- Resend integration for transactional email delivery.
- Razorpay integration with server-side key usage and INR/USD currency configuration.

### Discoverability and quality

- Route-level titles and descriptions, canonical URLs, sitemap, robots directives, and JSON-LD.
- Semantic HTML landmarks and accessible form labels.
- Responsive navigation, tables, forms, cards, and charts.
- Cloudflare edge deployment through Wrangler.

## Technology stack

| Layer | Technology | Why it is used |
| --- | --- | --- |
| UI | React 19 | Component-based interface development. |
| Full-stack framework | TanStack Start | File-based routing, server functions, and SSR-friendly structure. |
| Routing | TanStack Router | Typed, declarative navigation with route-level data and metadata. |
| Styling | Tailwind CSS 4 and custom CSS | Utility styling plus Ridge & Ride design tokens and responsive components. |
| Type safety | TypeScript | Safer contracts and server/client boundaries. |
| Authentication | Clerk | Managed sessions, Google sign-in, identity, and account security. |
| Database | Neon Postgres | Serverless persistence for catalog, profiles, orders, forms, and operations. |
| Payments | Razorpay | Checkout and server-created payment orders. |
| Email | Resend | Transactional customer and store notifications. |
| Analytics | PostHog | Product analytics with configurable hosting and privacy controls. |
| Charts | Recharts | Purchase-history and admin visualizations. |
| Icons and motion | Lucide React and GSAP | Consistent iconography and interaction polish. |
| Hosting | Cloudflare Workers | Edge runtime deployment with Wrangler. |
| Code quality | Biome | Formatting, linting, and static checks. |

## Architecture

```text
Browser
  └─ TanStack Router + React UI
       ├─ Server functions ── Clerk authentication
       ├─ Server functions ── Neon Postgres
       ├─ Server functions ── Razorpay orders
       └─ Server functions ── Resend email

Cloudflare Workers
  └─ TanStack Start application runtime
```

The browser receives only public client configuration. Database access, Clerk secret operations, Razorpay signing credentials, and Resend API calls remain server-side. Authorization checks are performed on the server for protected account and admin operations.

## Getting started

### Requirements

- Node.js 20 or newer.
- npm or another npm-compatible package manager.
- Neon Postgres, Clerk, Resend, and Razorpay accounts for full functionality.

### Install and run locally

```bash
git clone https://github.com/your-username/ridge-ride.git
cd ridge-ride/ridge-ride
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Never commit `.env.local` or production secrets.

```text
DATABASE_URL=
DATABASE_URL_POOLER=
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
STORE_SUPPORT_EMAIL=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
PUBLIC_SITE_URL=https://your-production-domain.example
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

`RAZORPAY_WEBHOOK_SECRET` is reserved for the webhook endpoint, which is intentionally configured after the first deployment. Razorpay international card acceptance requires account activation; API keys alone do not enable USD payments.

## Database setup

For a new database, use `db/init.sql`. For an existing production database, apply `db/migrations/001_production_readiness.sql` through your approved migration workflow. Review migrations before applying them to live data.

## Quality checks

```bash
npm run check
npx tsc --noEmit
npm run build
```

Before launch, verify authentication, product navigation, cart quantities, checkout order creation, database persistence, dashboard updates, admin access, emails, and mobile layouts in a deployed preview.

## Deployment

Ridge & Ride is configured for Cloudflare Workers through Wrangler:

```bash
npx wrangler login
npm run deploy
```

Set production secrets in the target Cloudflare environment using Wrangler or the Cloudflare dashboard. Update `public/robots.txt`, `public/sitemap.xml`, and `PUBLIC_SITE_URL` to the final HTTPS domain. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete launch checklist.

## Project structure

```text
src/
├── components/             Shared storefront, auth, dashboard, and layout UI
├── features/               Catalog, commerce, dashboard, email, and forms
├── integrations/           Clerk and PostHog providers
├── lib/                    Shared client utilities and metadata
├── routes/                 File-based pages and API routes
├── db.ts                   Database connection boundary
└── styles.css              Global design system and responsive styles
public/
├── images/                 Storefront and editorial imagery
├── robots.txt              Crawler directives
└── sitemap.xml             Search-engine route map
db/
├── init.sql                Initial schema and seed data
└── migrations/             Production database migrations
```

## Security and production notes

- Keep Clerk secret keys, Razorpay secrets, Resend keys, and database URLs server-side.
- Use separate test and live credentials for Razorpay.
- Do not treat client-side payment state as final; verify payment data server-side and add the Razorpay webhook before relying on asynchronous payment events.
- Run migrations against the intended Neon branch and database.
- Configure a verified sending domain in Resend before sending production email at scale.
- Replace placeholder social links and the example public URL before publishing.
- Review tax, shipping, refund, inventory, and international-payment policies for your operating countries.

## Roadmap

- Razorpay webhook endpoint and signature verification.
- Atomic inventory reservation, decrement, and rollback across payment states.
- Automated payment-failure, refund, and shipping notifications.
- Production fulfillment and shipping-provider integration.
- Expanded editorial CMS and moderated product reviews.
- Automated end-to-end testing against isolated Razorpay, Neon, and Resend environments.

## License

This project is currently private and intended for Ridge & Ride development and deployment. Add a license here if the repository will be distributed publicly.

## Connect

Use the LinkedIn, Twitter/X, Behance, and repository buttons at the top of this README to connect. Replace their placeholder destinations with your real profile URLs before sharing the project.
