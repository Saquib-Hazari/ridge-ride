import { createServerFn } from "@tanstack/react-start";
import { getClient } from "../../db";
import { emailService } from "../email/email-service.server";

function text(value: unknown, max: number) {
	return typeof value === "string" ? value.trim().slice(0, max) : "";
}
async function db() {
	const sql = await getClient();
	if (!sql) throw new Error("Database is unavailable.");
	return sql;
}

export const subscribeNewsletter = createServerFn({
	method: "POST",
	strict: false,
})
	.validator((data: unknown) => data)
	.handler(async ({ data }) => {
		const email = text(
			(data as Record<string, unknown>)?.email,
			254,
		).toLowerCase();
		if (!/^\S+@\S+\.\S+$/.test(email))
			throw new Error("Enter a valid email address.");
		const sql = await db();
		await sql.query(
			`INSERT INTO newsletter_subscribers (id, email) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET status = 'subscribed'`,
			[`subscriber-${crypto.randomUUID()}`, email],
		);
		return { subscribed: true };
	});

export const submitContactMessage = createServerFn({
	method: "POST",
	strict: false,
})
	.validator((data: unknown) => data)
	.handler(async ({ data }) => {
		const input = (data || {}) as Record<string, unknown>;
		const name = text(input.name, 120);
		const email = text(input.email, 254).toLowerCase();
		const phone = text(input.phone, 40);
		const topic = text(input.topic, 80) || "General inquiry";
		const message = text(input.message, 4000);
		if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || message.length < 10)
			throw new Error("Complete your name, email, and message.");
		const sql = await db();
		await sql.query(
			`INSERT INTO contact_messages (id, name, email, phone, topic, message) VALUES ($1,$2,$3,$4,$5,$6)`,
			[
				`contact-${crypto.randomUUID()}`,
				name,
				email,
				phone || null,
				topic,
				message,
			],
		);
		if (process.env.STORE_SUPPORT_EMAIL)
			await emailService.notifyContactMessage({
				name,
				email,
				phone,
				topic,
				message,
			});
		return { submitted: true };
	});

export const submitServiceBooking = createServerFn({
	method: "POST",
	strict: false,
})
	.validator((data: unknown) => data)
	.handler(async ({ data }) => {
		const input = (data || {}) as Record<string, unknown>;
		const name = text(input.name, 120);
		const email = text(input.email, 254).toLowerCase();
		const phone = text(input.phone, 40);
		const bikeModel = text(input.bikeModel ?? input.bike, 160);
		const serviceType = text(input.serviceType ?? input.service, 100);
		const preferredDate = text(input.preferredDate ?? input.date, 20);
		const notes = text(input.notes, 4000);
		if (
			name.length < 2 ||
			!/^\S+@\S+\.\S+$/.test(email) ||
			bikeModel.length < 2 ||
			serviceType.length < 2
		)
			throw new Error("Complete the required service fields.");
		const sql = await db();
		await sql.query(
			`INSERT INTO service_bookings (id, customer_name, email, phone, bike_model, service_type, preferred_date, notes) VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7,'')::date,NULLIF($8,''))`,
			[
				`service-${crypto.randomUUID()}`,
				name,
				email,
				phone || null,
				bikeModel,
				serviceType,
				preferredDate,
				notes,
			],
		);
		await emailService.notifyServiceBooking({
			name,
			email,
			phone,
			bikeModel,
			serviceType,
			preferredDate,
			notes,
		});
		return { submitted: true };
	});
