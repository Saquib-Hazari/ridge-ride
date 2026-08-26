# Production deployment checklist

## 1. Configure secrets in the Cloudflare/Wrangler environment

Set these as encrypted production secrets or environment variables. Never commit `.env.local`.

```text
DATABASE_URL
VITE_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
STORE_SUPPORT_EMAIL
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
PUBLIC_SITE_URL
```

`RAZORPAY_WEBHOOK_SECRET` is intentionally deferred until the webhook endpoint is added.

## 2. Run the database migration

Run `db/migrations/001_production_readiness.sql` against the production Neon database, then run the seed/schema setup from `db/init.sql` only if the database is new.

## 3. Set the deployed domain

Replace `your-production-domain.example` in `public/robots.txt` and `public/sitemap.xml` with the final HTTPS domain. The same domain must be used for `PUBLIC_SITE_URL`.

## 4. Validate before launch

```bash
npm run check
npx tsc --noEmit
npm run build
```

Complete one Razorpay test payment and verify the order, stock decrement, confirmation email, contact form, newsletter form, service booking, dashboard update, shipment email, and refund email before switching Razorpay to live mode.
