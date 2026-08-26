import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { getClient } from "../../db";
import { emailService } from "../email/email-service.server";

type CheckoutLine = { quantity: number; variantId: string };
type CheckoutInput = {
	address: {
		city: string;
		countryCode: string;
		fullName: string;
		line1: string;
		line2?: string;
		phone?: string;
		postalCode: string;
		region: string;
	};
	email: string;
	lines: CheckoutLine[];
};

function safeText(value: unknown, max: number) {
	return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function credentials() {
	const key = process.env.RAZORPAY_KEY_ID;
	const secret = process.env.RAZORPAY_KEY_SECRET;
	if (!key || !secret) throw new Error("Payment provider is not configured.");
	return { key, token: btoa(`${key}:${secret}`) };
}
async function database() {
	const sql = await getClient();
	if (!sql) throw new Error("Database is unavailable.");
	return sql;
}

export const createRazorpayOrder = createServerFn({
	method: "POST",
	strict: false,
})
	.validator((data: unknown) => data)
	.handler(async ({ data }) => {
		const input = data as Partial<CheckoutInput>;
		const lines = Array.isArray(input.lines) ? input.lines.slice(0, 50) : [];
		const email = safeText(input.email, 254).toLowerCase();
		const address = (input.address || {}) as Record<string, unknown>;
		if (!/^\S+@\S+\.\S+$/.test(email) || !lines.length)
			throw new Error("Enter a valid email and add an item before checkout.");
		const addressValues = {
			city: safeText(address.city, 80),
			countryCode: safeText(address.countryCode, 2).toUpperCase(),
			fullName: safeText(address.fullName, 120),
			line1: safeText(address.line1, 180),
			line2: safeText(address.line2, 180),
			phone: safeText(address.phone, 40),
			postalCode: safeText(address.postalCode, 20),
			region: safeText(address.region, 80),
		};
		if (
			!addressValues.fullName ||
			!addressValues.line1 ||
			!addressValues.city ||
			!addressValues.region ||
			!addressValues.postalCode ||
			!/^[A-Z]{2}$/.test(addressValues.countryCode)
		)
			throw new Error("Complete the delivery address.");
		const sql = await database();
		const variantIds = lines.map((line) => safeText(line.variantId, 100));
		const variants = (await sql.query(
			`SELECT v.id, v.sku, v.price_cents, v.stock_quantity, v.product_id, p.name, p.currency, v.color_name, v.frame_size FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.id = ANY($1) AND v.is_active = TRUE AND p.status = 'active'`,
			[variantIds],
		)) as unknown as {
			color_name: string;
			currency: string;
			frame_size: string;
			id: string;
			name: string;
			price_cents: number;
			product_id: string;
			sku: string;
			stock_quantity: number;
		}[];
		const byId = new Map(variants.map((variant) => [variant.id, variant]));
		let subtotalCents = 0;
		const items = lines.map((line) => {
			const variant = byId.get(line.variantId);
			const quantity = Math.floor(Number(line.quantity));
			if (
				!variant ||
				!Number.isInteger(quantity) ||
				quantity < 1 ||
				quantity > 99
			)
				throw new Error("One of the selected items is no longer available.");
			if (variant.stock_quantity < quantity)
				throw new Error(
					`${variant.name} does not have enough stock for that quantity.`,
				);
			subtotalCents += variant.price_cents * quantity;
			return { quantity, variant };
		});
		const shippingCents = subtotalCents >= 10000 ? 0 : 1200;
		const totalCents = subtotalCents + shippingCents;
		const razorpay = credentials();
		const paymentResponse = await fetch("https://api.razorpay.com/v1/orders", {
			method: "POST",
			headers: {
				Authorization: `Basic ${razorpay.token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				amount: totalCents,
				currency: "USD",
				receipt: `rr_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`,
				payment_capture: 1,
			}),
		});
		const paymentOrder = (await paymentResponse.json()) as {
			id?: string;
			error?: { description?: string };
		};
		if (!paymentResponse.ok || !paymentOrder.id)
			throw new Error(
				paymentOrder.error?.description ||
					"Payment provider could not create an order.",
			);
		const identity = await auth();
		const userId = identity.userId || null;
		const orderId = `order-${crypto.randomUUID()}`;
		const orderNumber = `RR-${new Date().getUTCFullYear()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
		const addressId = `address-${crypto.randomUUID()}`;
		await sql.query(
			`INSERT INTO addresses (id, clerk_user_id, full_name, line1, line2, city, region, postal_code, country_code, phone) VALUES ($1, $2, $3, $4, NULLIF($5,''), $6, $7, $8, $9, NULLIF($10,''))`,
			[
				addressId,
				userId || `guest:${email}`,
				addressValues.fullName,
				addressValues.line1,
				addressValues.line2,
				addressValues.city,
				addressValues.region,
				addressValues.postalCode,
				addressValues.countryCode,
				addressValues.phone,
			],
		);
		await sql.query(
			`INSERT INTO orders (id, order_number, clerk_user_id, email, status, currency, subtotal_cents, shipping_cents, total_cents, shipping_address_id, payment_provider, provider_order_id) VALUES ($1,$2,$3,$4,'pending','USD',$5,$6,$7,$8,'razorpay',$9)`,
			[
				orderId,
				orderNumber,
				userId,
				email,
				subtotalCents,
				shippingCents,
				totalCents,
				addressId,
				paymentOrder.id,
			],
		);
		for (const item of items)
			await sql.query(
				`INSERT INTO order_items (id, order_id, variant_id, product_name, sku, unit_price_cents, quantity) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				[
					`item-${crypto.randomUUID()}`,
					orderId,
					item.variant.id,
					item.variant.name,
					item.variant.sku,
					item.variant.price_cents,
					item.quantity,
				],
			);
		return {
			amount: totalCents,
			currency: "USD",
			keyId: razorpay.key,
			orderId: paymentOrder.id,
			orderNumber,
		};
	});

export const verifyRazorpayPayment = createServerFn({
	method: "POST",
	strict: false,
})
	.validator((data: unknown) => data)
	.handler(async ({ data }) => {
		const input = (data || {}) as Record<string, unknown>;
		const razorpayOrderId = safeText(input.razorpayOrderId, 100);
		const paymentId = safeText(input.razorpayPaymentId, 100);
		const signature = safeText(input.razorpaySignature, 200);
		const orderNumber = safeText(input.orderNumber, 100);
		if (!razorpayOrderId || !paymentId || !signature || !orderNumber)
			throw new Error("Payment verification data is incomplete.");
		const secret = process.env.RAZORPAY_KEY_SECRET;
		if (!secret) throw new Error("Payment provider is not configured.");
		const expected = await crypto.subtle.importKey(
			"raw",
			new TextEncoder().encode(secret),
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["sign"],
		);
		const digest = await crypto.subtle.sign(
			"HMAC",
			expected,
			new TextEncoder().encode(`${razorpayOrderId}|${paymentId}`),
		);
		const calculated = Array.from(new Uint8Array(digest))
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");
		if (calculated !== signature)
			throw new Error("Payment verification failed.");
		const sql = await database();
		const orders = (await sql.query(
			`WITH target AS (
				SELECT id FROM orders WHERE order_number = $2 AND provider_order_id = $3 AND status = 'pending'
			), eligible AS (
				SELECT oi.variant_id, oi.quantity FROM order_items oi JOIN target o ON o.id = oi.order_id
				JOIN product_variants v ON v.id = oi.variant_id
				WHERE v.stock_quantity >= oi.quantity
			), stock AS (
				UPDATE product_variants v SET stock_quantity = v.stock_quantity - e.quantity, updated_at = NOW()
				FROM eligible e WHERE v.id = e.variant_id
				AND (SELECT COUNT(*) FROM eligible) = (SELECT COUNT(*) FROM order_items oi JOIN target o ON o.id = oi.order_id)
				RETURNING v.id
			), movements AS (
				INSERT INTO inventory_movements (variant_id, quantity_delta, reason, reference_type, reference_id)
				SELECT oi.variant_id, -oi.quantity, 'sale', 'order', o.id
				FROM order_items oi JOIN target o ON o.id = oi.order_id JOIN stock s ON s.id = oi.variant_id
				RETURNING id
			)
			UPDATE orders o SET status = 'paid', provider_payment_id = $1, paid_at = NOW(), updated_at = NOW()
			WHERE o.id IN (SELECT id FROM target) AND (SELECT COUNT(*) FROM stock) = (SELECT COUNT(*) FROM order_items oi JOIN target t ON t.id = oi.order_id)
			RETURNING o.id, o.order_number, o.email, o.subtotal_cents, o.shipping_cents, o.tax_cents, o.discount_cents, o.total_cents, o.currency, o.shipping_address_id`,
			[paymentId, orderNumber, razorpayOrderId],
		)) as unknown as {
			currency: string;
			discount_cents: number;
			email: string;
			id: string;
			order_number: string;
			shipping_address_id: string;
			shipping_cents: number;
			subtotal_cents: number;
			tax_cents: number;
			total_cents: number;
		}[];
		if (!orders[0])
			throw new Error(
				"Payment received, but inventory is no longer available. Contact support for a refund.",
			);
		const order = orders[0];
		const items = (await sql.query(
			`SELECT product_name, quantity, unit_price_cents, sku FROM order_items WHERE order_id = $1`,
			[order.id],
		)) as unknown as {
			product_name: string;
			quantity: number;
			sku: string;
			unit_price_cents: number;
		}[];
		const address = (await sql.query(
			`SELECT full_name, line1, line2, city, region, postal_code, country_code FROM addresses WHERE id = $1`,
			[order.shipping_address_id],
		)) as unknown as {
			city: string;
			country_code: string;
			full_name: string;
			line1: string;
			line2: string | null;
			postal_code: string;
			region: string;
		}[];
		await emailService.sendOrderConfirmation(order.email, {
			customerName: address[0]?.full_name || "Rider",
			orderNumber: order.order_number,
			items: items.map((item) => ({
				name: item.product_name,
				quantity: item.quantity,
				unitPriceCents: item.unit_price_cents,
				variantLabel: item.sku,
			})),
			subtotalCents: order.subtotal_cents,
			shippingCents: order.shipping_cents,
			taxCents: order.tax_cents,
			discountCents: order.discount_cents,
			totalCents: order.total_cents,
			currency: order.currency,
			paymentId,
			shippingAddress: [
				address[0]?.full_name,
				address[0]?.line1,
				address[0]?.line2 || "",
				`${address[0]?.city}, ${address[0]?.region} ${address[0]?.postal_code}`,
				address[0]?.country_code,
			].filter(Boolean),
		});
		return { orderNumber };
	});

export const recordPaymentFailure = createServerFn({
	method: "POST",
	strict: false,
})
	.validator((data: unknown) => data)
	.handler(async ({ data }) => {
		const input = (data || {}) as Record<string, unknown>;
		const orderNumber = safeText(input.orderNumber, 100);
		if (!orderNumber) return { recorded: false };
		const sql = await database();
		const rows = (await sql.query(
			`SELECT email FROM orders WHERE order_number = $1 AND status = 'pending'`,
			[orderNumber],
		)) as unknown as { email: string }[];
		if (rows[0])
			await emailService.sendPaymentFailed(rows[0].email, orderNumber);
		return { recorded: Boolean(rows[0]) };
	});
