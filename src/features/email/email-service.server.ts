/**
 * Resend email microservice.
 *
 * This module is server-only. It intentionally uses Resend's HTTP API instead
 * of the Node SDK so it remains compatible with Cloudflare Workers.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type OrderEmailItem = {
	name: string;
	quantity: number;
	unitPriceCents: number;
	variantLabel?: string;
};

export type OrderEmailData = {
	customerName: string;
	orderNumber: string;
	items: OrderEmailItem[];
	subtotalCents: number;
	shippingCents: number;
	taxCents: number;
	discountCents: number;
	totalCents: number;
	currency?: string;
	shippingAddress: string[];
	paymentId?: string;
};

export type ServiceBookingEmailData = {
	name: string;
	email: string;
	phone?: string;
	bikeModel: string;
	serviceType: string;
	preferredDate?: string;
	notes?: string;
};

export type ContactMessageEmailData = {
	name: string;
	email: string;
	phone?: string;
	topic: string;
	message: string;
};

type ResendResponse = { id?: string; message?: string };

export class ResendEmailService {
	private readonly apiKey: string;
	private readonly from: string;
	private readonly supportEmail: string;

	constructor(
		config: { apiKey?: string; from?: string; supportEmail?: string } = {},
	) {
		this.apiKey = config.apiKey || process.env.RESEND_API_KEY || "";
		this.from =
			config.from || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
		this.supportEmail =
			config.supportEmail || process.env.STORE_SUPPORT_EMAIL || "";
	}

	async sendOrderConfirmation(to: string, order: OrderEmailData) {
		return this.send({
			to: [to],
			subject: `Order ${order.orderNumber} is confirmed`,
			html: orderConfirmationTemplate(order),
		});
	}

	async sendPaymentFailed(to: string, orderNumber: string) {
		return this.send({
			to: [to],
			subject: `Payment failed for order ${orderNumber}`,
			html: simpleTemplate(
				"Payment could not be completed",
				`<p>We could not confirm payment for order <strong>${escapeHtml(orderNumber)}</strong>. No order will be fulfilled until payment succeeds.</p><p>Please return to checkout and try again.</p>`,
			),
		});
	}

	async sendShipmentUpdate(to: string, orderNumber: string, tracking?: string) {
		const trackingCopy = tracking
			? `<p>Tracking reference: <strong>${escapeHtml(tracking)}</strong></p>`
			: "";
		return this.send({
			to: [to],
			subject: `Your order ${orderNumber} has shipped`,
			html: simpleTemplate(
				"Your order is on the way",
				`<p>Order <strong>${escapeHtml(orderNumber)}</strong> has been dispatched.</p>${trackingCopy}`,
			),
		});
	}

	async sendRefundConfirmation(
		to: string,
		orderNumber: string,
		amountCents: number,
		currency = "USD",
	) {
		return this.send({
			to: [to],
			subject: `Refund issued for order ${orderNumber}`,
			html: simpleTemplate(
				"Your refund has been issued",
				`<p>A refund of <strong>${formatMoney(amountCents, currency)}</strong> was issued for order <strong>${escapeHtml(orderNumber)}</strong>.</p>`,
			),
		});
	}

	async notifyServiceBooking(booking: ServiceBookingEmailData) {
		if (!this.supportEmail)
			throw new EmailServiceError("STORE_SUPPORT_EMAIL is not configured.");
		return this.send({
			to: [this.supportEmail],
			replyTo: booking.email,
			subject: `New service booking request: ${booking.bikeModel}`,
			html: serviceBookingTemplate(booking),
		});
	}

	async notifyContactMessage(message: ContactMessageEmailData) {
		if (!this.supportEmail)
			throw new EmailServiceError("STORE_SUPPORT_EMAIL is not configured.");
		return this.send({
			to: [this.supportEmail],
			replyTo: message.email,
			subject: `New contact message: ${message.topic}`,
			html: baseTemplate(
				"New contact message",
				`<p><strong>${escapeHtml(message.name)}</strong> sent a message about <strong>${escapeHtml(message.topic)}</strong>.</p><p>Email: ${escapeHtml(message.email)}<br>Phone: ${escapeHtml(message.phone || "Not provided")}</p><p>${escapeHtml(message.message)}</p>`,
			),
		});
	}

	private async send(input: {
		to: string[];
		subject: string;
		html: string;
		replyTo?: string;
	}) {
		if (!this.apiKey)
			throw new EmailServiceError("RESEND_API_KEY is not configured.");
		const response = await fetch(RESEND_ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: this.from,
				to: input.to,
				subject: input.subject,
				html: input.html,
				...(input.replyTo ? { reply_to: input.replyTo } : {}),
			}),
		});
		const body = (await response.json().catch(() => ({}))) as ResendResponse;
		if (!response.ok)
			throw new EmailServiceError(
				body.message || `Resend request failed with status ${response.status}.`,
			);
		return { id: body.id || "" };
	}
}

export class EmailServiceError extends Error {
	readonly name = "EmailServiceError";
}

export const emailService = new ResendEmailService();

function orderConfirmationTemplate(order: OrderEmailData) {
	const currency = order.currency || "USD";
	const rows = order.items
		.map(
			(item) =>
				`<tr><td>${escapeHtml(item.name)}${item.variantLabel ? `<br><small>${escapeHtml(item.variantLabel)}</small>` : ""}</td><td>${item.quantity}</td><td>${formatMoney(item.unitPriceCents * item.quantity, currency)}</td></tr>`,
		)
		.join("");
	return baseTemplate(
		`Order ${order.orderNumber} confirmed`,
		`<p>Hi ${escapeHtml(order.customerName)},</p><p>Thanks for your order. We have received your payment and are preparing the items below.</p><h2>Order ${escapeHtml(order.orderNumber)}</h2><table><thead><tr><th align="left">Item</th><th align="left">Qty</th><th align="left">Amount</th></tr></thead><tbody>${rows}</tbody></table><p>Subtotal: ${formatMoney(order.subtotalCents, currency)}<br>Shipping: ${formatMoney(order.shippingCents, currency)}<br>Tax: ${formatMoney(order.taxCents, currency)}<br>Discount: −${formatMoney(order.discountCents, currency)}<br><strong>Total: ${formatMoney(order.totalCents, currency)}</strong></p><h3>Delivery address</h3><p>${order.shippingAddress.map(escapeHtml).join("<br>")}</p>${order.paymentId ? `<p>Payment reference: ${escapeHtml(order.paymentId)}</p>` : ""}`,
	);
}

function serviceBookingTemplate(booking: ServiceBookingEmailData) {
	return baseTemplate(
		"New service booking request",
		`<p><strong>${escapeHtml(booking.name)}</strong> requested <strong>${escapeHtml(booking.serviceType)}</strong> for <strong>${escapeHtml(booking.bikeModel)}</strong>.</p><p>Email: ${escapeHtml(booking.email)}<br>Phone: ${escapeHtml(booking.phone || "Not provided")}<br>Preferred date: ${escapeHtml(booking.preferredDate || "Not specified")}</p><p>${escapeHtml(booking.notes || "No notes provided")}</p>`,
	);
}

function simpleTemplate(title: string, content: string) {
	return baseTemplate(title, content);
}

function baseTemplate(title: string, content: string) {
	return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1c241f;line-height:1.6"><main style="max-width:620px;margin:0 auto;padding:32px"><p style="color:#397d66;font-weight:700">RIDGE &amp; RIDE</p><h1>${escapeHtml(title)}</h1>${content}<hr><p style="color:#68736d;font-size:12px">This is an automated message from Ridge &amp; Ride.</p></main></body></html>`;
}

function formatMoney(cents: number, currency: string) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(Math.max(0, cents) / 100);
}
function escapeHtml(value: string) {
	return value.replace(
		/[&<>'"]/g,
		(character) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
				character
			] || character,
	);
}
