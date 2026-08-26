import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { compile } from "@mdx-js/mdx";
import { createServerFn } from "@tanstack/react-start";
import { getClient } from "../../db";
import { emailService } from "../email/email-service.server";

const ADMIN_EMAIL = "saquibhazari1000@gmail.com";
const MAX_AVATAR_DATA_URL_LENGTH = 1_400_000;

type AccountRecord = {
	avatarDataUrl: string | null;
	displayName: string;
	email: string;
	phone: string | null;
	userId: string;
};

export type AddressRecord = {
	city: string;
	countryCode: string;
	fullName: string;
	id: string;
	line1: string;
	line2: string | null;
	phone: string | null;
	postalCode: string;
	region: string;
};

type OrderRecord = {
	createdAt: string;
	orderNumber: string;
	status: string;
	totalCents: number;
};

export type CustomerDashboardData = {
	account: AccountRecord;
	addresses: AddressRecord[];
	orders: OrderRecord[];
	purchaseHistory: { month: string; totalCents: number }[];
};

export type AdminDashboardData = {
	metrics: {
		delivered: number;
		pending: number;
		profitCents: number;
		revenueCents: number;
		returns: number;
	};
	monthlyRevenue: { month: string; revenue: number }[];
	orderStatuses: { name: string; value: number }[];
	recentOrders: OrderRecord[];
	posts: {
		id: string;
		slug: string;
		status: string;
		title: string;
		updatedAt: string;
	}[];
};

async function db() {
	const client = await getClient();
	if (!client) throw new Error("Database is unavailable.");
	return client;
}

async function identity(): Promise<{ email: string; userId: string } | null> {
	const { userId } = await auth();
	if (!userId) return null;
	const user = await clerkClient().users.getUser(userId);
	const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
	return email ? { email, userId } : null;
}

async function requireAdmin() {
	const current = await identity();
	if (!current || current.email !== ADMIN_EMAIL) throw new Error("Forbidden");
	return current;
}

export const getAuthDestination = createServerFn({ method: "GET" }).handler(
	async () => {
		const current = await identity();
		return current?.email === ADMIN_EMAIL ? "/admin" : "/account";
	},
);

function asSafeText(value: unknown, maxLength: number): string {
	return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
}

export const loadCustomerDashboard = createServerFn({ method: "GET" }).handler(
	async (): Promise<CustomerDashboardData | null> => {
		const current = await identity();
		if (!current) return null;
		const sql = await db();
		const profiles = (await sql.query(
			`SELECT display_name, email, phone, avatar_data_url
			 FROM customer_profiles WHERE clerk_user_id = $1 LIMIT 1`,
			[current.userId],
		)) as unknown as {
			avatar_data_url: string | null;
			display_name: string;
			email: string | null;
			phone: string | null;
		}[];
		const [orders, purchaseRows] = await Promise.all([
			sql.query(
				`SELECT order_number, status, total_cents, created_at
			 FROM orders WHERE clerk_user_id = $1 ORDER BY created_at DESC LIMIT 20`,
				[current.userId],
			),
			sql.query(
				`SELECT TO_CHAR(date_trunc('month', created_at), 'Mon YYYY') AS month,
					COALESCE(SUM(total_cents), 0)::int AS total_cents
				 FROM orders WHERE clerk_user_id = $1 AND status IN ('paid', 'fulfilled', 'refunded')
				 GROUP BY date_trunc('month', created_at) ORDER BY date_trunc('month', created_at) DESC LIMIT 6`,
				[current.userId],
			),
		]);
		const orderRows = orders as unknown as {
			created_at: string;
			order_number: string;
			status: string;
			total_cents: number;
		}[];
		const addresses = (await sql.query(
			`SELECT id, full_name, line1, line2, city, region, postal_code, country_code, phone
			 FROM addresses WHERE clerk_user_id = $1 ORDER BY created_at DESC LIMIT 10`,
			[current.userId],
		)) as unknown as {
			city: string;
			country_code: string;
			full_name: string;
			id: string;
			line1: string;
			line2: string | null;
			phone: string | null;
			postal_code: string;
			region: string;
		}[];
		const profile = profiles[0];
		return {
			account: {
				avatarDataUrl: profile?.avatar_data_url || null,
				displayName: profile?.display_name || current.email.split("@")[0],
				email: profile?.email || current.email,
				phone: profile?.phone || null,
				userId: current.userId,
			},
			addresses: addresses.map((address) => ({
				city: address.city,
				countryCode: address.country_code,
				fullName: address.full_name,
				id: address.id,
				line1: address.line1,
				line2: address.line2,
				phone: address.phone,
				postalCode: address.postal_code,
				region: address.region,
			})),
			orders: orderRows.map((order) => ({
				createdAt: new Date(order.created_at).toISOString(),
				orderNumber: order.order_number,
				status: order.status,
				totalCents: order.total_cents,
			})),
			purchaseHistory: (
				purchaseRows as unknown as { month: string; total_cents: number }[]
			)
				.reverse()
				.map((row) => ({
					month: row.month,
					totalCents: Number(row.total_cents),
				})),
		};
	},
);

export const updateOrderStatus = createServerFn({
	method: "POST",
	strict: false,
})
	.validator((data: unknown) => data)
	.handler(async ({ data }) => {
		await requireAdmin();
		const input = (data || {}) as Record<string, unknown>;
		const orderNumber = asSafeText(input.orderNumber, 100);
		const status = asSafeText(input.status, 20);
		const tracking = asSafeText(input.tracking, 120);
		if (
			!orderNumber ||
			!["fulfilled", "refunded", "cancelled"].includes(status)
		)
			throw new Error("Invalid order update.");
		const sql = await db();
		const rows = (await sql.query(
			`SELECT id, email, total_cents, currency FROM orders WHERE order_number = $1 AND status IN ('paid', 'fulfilled')`,
			[orderNumber],
		)) as unknown as {
			id: string;
			email: string;
			total_cents: number;
			currency: string;
		}[];
		const order = rows[0];
		if (!order) throw new Error("Order is not eligible for this update.");
		if (status === "refunded") {
			await sql.transaction((txn) => [
				txn`UPDATE orders SET status = 'refunded', updated_at = NOW() WHERE id = ${order.id}`,
				txn`WITH restored AS (UPDATE product_variants v SET stock_quantity = v.stock_quantity + oi.quantity, updated_at = NOW() FROM order_items oi WHERE oi.order_id = ${order.id} AND v.id = oi.variant_id RETURNING v.id, oi.quantity) INSERT INTO inventory_movements (variant_id, quantity_delta, reason, reference_type, reference_id) SELECT id, quantity, 'return', 'order', ${order.id} FROM restored`,
			]);
			await emailService.sendRefundConfirmation(
				order.email,
				orderNumber,
				order.total_cents,
				order.currency,
			);
		} else {
			await sql.query(
				`UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
				[status, order.id],
			);
			if (status === "fulfilled")
				await emailService.sendShipmentUpdate(
					order.email,
					orderNumber,
					tracking || undefined,
				);
		}
		return { updated: true };
	});

export const updateCustomerProfile = createServerFn({
	method: "POST",
	strict: false,
})
	.validator((data: unknown) => data)
	.handler(async ({ data }) => {
		const current = await identity();
		if (!current) throw new Error("Sign in to update your profile.");
		const input = (data || {}) as Record<string, unknown>;
		const displayName = asSafeText(input.displayName, 120);
		const phone = asSafeText(input.phone, 40);
		if (displayName.length < 2) throw new Error("Enter your name.");
		const sql = await db();
		await sql.query(
			`INSERT INTO customer_profiles (clerk_user_id, display_name, email, phone, updated_at)
			 VALUES ($1, $2, $3, $4, NOW())
			 ON CONFLICT (clerk_user_id) DO UPDATE SET display_name = EXCLUDED.display_name, phone = EXCLUDED.phone, updated_at = NOW()`,
			[current.userId, displayName, current.email, phone || null],
		);
		return { displayName, phone: phone || null };
	});

export const saveCustomerAddress = createServerFn({
	method: "POST",
	strict: false,
})
	.validator((data: unknown) => data)
	.handler(async ({ data }) => {
		const current = await identity();
		if (!current) throw new Error("Sign in to save an address.");
		const input = (data || {}) as Record<string, unknown>;
		const values = {
			city: asSafeText(input.city, 80),
			countryCode: asSafeText(input.countryCode, 2).toUpperCase(),
			fullName: asSafeText(input.fullName, 120),
			line1: asSafeText(input.line1, 180),
			line2: asSafeText(input.line2, 180),
			phone: asSafeText(input.phone, 40),
			postalCode: asSafeText(input.postalCode, 20),
			region: asSafeText(input.region, 80),
		};
		if (
			!values.fullName ||
			!values.line1 ||
			!values.city ||
			!values.region ||
			!values.postalCode ||
			!/^[A-Z]{2}$/.test(values.countryCode)
		)
			throw new Error("Complete all required address fields.");
		const sql = await db();
		const id =
			typeof input.id === "string" && /^[a-z0-9-]{1,100}$/.test(input.id)
				? input.id
				: `address-${crypto.randomUUID()}`;
		await sql.query(
			`INSERT INTO addresses (id, clerk_user_id, full_name, line1, line2, city, region, postal_code, country_code, phone)
			 VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7, $8, $9, NULLIF($10, ''))
			 ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, line1 = EXCLUDED.line1, line2 = EXCLUDED.line2, city = EXCLUDED.city, region = EXCLUDED.region, postal_code = EXCLUDED.postal_code, country_code = EXCLUDED.country_code, phone = EXCLUDED.phone
			 WHERE addresses.clerk_user_id = $2`,
			[
				id,
				current.userId,
				values.fullName,
				values.line1,
				values.line2,
				values.city,
				values.region,
				values.postalCode,
				values.countryCode,
				values.phone,
			],
		);
		return { id };
	});

export const deleteCustomerAddress = createServerFn({
	method: "POST",
	strict: false,
})
	.validator((data: unknown) => data)
	.handler(async ({ data }) => {
		const current = await identity();
		if (!current) throw new Error("Sign in to manage addresses.");
		const id = (data as Record<string, unknown> | null)?.id;
		if (typeof id !== "string") throw new Error("Address not found.");
		const sql = await db();
		await sql.query(
			`DELETE FROM addresses WHERE id = $1 AND clerk_user_id = $2`,
			[id, current.userId],
		);
		return { id };
	});

export const saveCustomerAvatar = createServerFn({
	method: "POST",
	strict: false,
})
	.validator((data: unknown) => data)
	.handler(async ({ data }) => {
		const current = await identity();
		if (!current) throw new Error("Sign in to update your profile.");
		const input = (data || {}) as Record<string, unknown>;
		const avatarDataUrl = asSafeText(
			input.avatarDataUrl,
			MAX_AVATAR_DATA_URL_LENGTH,
		);
		if (
			!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(avatarDataUrl)
		) {
			throw new Error("Choose a PNG, JPEG, or WebP image under 1 MB.");
		}
		const sql = await db();
		await sql.query(
			`INSERT INTO customer_profiles (clerk_user_id, display_name, email, avatar_data_url, updated_at)
			 VALUES ($1, $2, $3, $4, NOW())
			 ON CONFLICT (clerk_user_id) DO UPDATE SET avatar_data_url = EXCLUDED.avatar_data_url, updated_at = NOW()`,
			[
				current.userId,
				current.email.split("@")[0],
				current.email,
				avatarDataUrl,
			],
		);
		return { avatarDataUrl };
	});

export const deleteCustomerAvatar = createServerFn({
	method: "POST",
	strict: false,
})
	.validator((data: unknown) => data)
	.handler(async () => {
		const current = await identity();
		if (!current) throw new Error("Sign in to update your profile.");
		const sql = await db();
		await sql.query(
			`UPDATE customer_profiles SET avatar_data_url = NULL, updated_at = NOW() WHERE clerk_user_id = $1`,
			[current.userId],
		);
		return { deleted: true };
	});

export const loadAdminDashboard = createServerFn({ method: "GET" }).handler(
	async (): Promise<AdminDashboardData | null> => {
		const current = await identity();
		if (!current || current.email !== ADMIN_EMAIL) return null;
		const sql = await db();
		const [metricRows, monthlyRows, statusRows, orderRows, postRows] =
			await Promise.all([
				sql.query(`SELECT
			COALESCE(SUM(CASE WHEN status IN ('paid', 'fulfilled') THEN total_cents ELSE 0 END), 0)::int AS revenue_cents,
			COALESCE(SUM(CASE WHEN status = 'fulfilled' THEN total_cents * 0.32 ELSE 0 END), 0)::int AS profit_cents,
			COUNT(*) FILTER (WHERE status IN ('pending', 'paid'))::int AS pending,
			COUNT(*) FILTER (WHERE status = 'fulfilled')::int AS delivered,
			COUNT(*) FILTER (WHERE status IN ('cancelled', 'refunded'))::int AS returns
			FROM orders`),
				sql.query(`SELECT TO_CHAR(date_trunc('month', created_at), 'Mon') AS month,
			COALESCE(SUM(CASE WHEN status IN ('paid', 'fulfilled') THEN total_cents ELSE 0 END), 0)::int AS revenue
			FROM orders WHERE created_at >= NOW() - INTERVAL '5 months'
			GROUP BY date_trunc('month', created_at) ORDER BY date_trunc('month', created_at)`),
				sql.query(
					`SELECT status AS name, COUNT(*)::int AS value FROM orders GROUP BY status ORDER BY status`,
				),
				sql.query(
					`SELECT order_number, status, total_cents, created_at FROM orders ORDER BY created_at DESC LIMIT 8`,
				),
				sql.query(
					`SELECT id, slug, title, status, updated_at FROM blog_posts ORDER BY updated_at DESC LIMIT 8`,
				),
			]);
		const metrics = (
			metricRows as unknown as AdminDashboardData["metrics"][]
		)[0] || {
			delivered: 0,
			pending: 0,
			profitCents: 0,
			revenueCents: 0,
			returns: 0,
		};
		return {
			metrics: {
				delivered: Number(
					(metrics as unknown as Record<string, number>).delivered || 0,
				),
				pending: Number(
					(metrics as unknown as Record<string, number>).pending || 0,
				),
				profitCents: Number(
					(metrics as unknown as Record<string, number>).profit_cents || 0,
				),
				revenueCents: Number(
					(metrics as unknown as Record<string, number>).revenue_cents || 0,
				),
				returns: Number(
					(metrics as unknown as Record<string, number>).returns || 0,
				),
			},
			monthlyRevenue: (
				monthlyRows as unknown as { month: string; revenue: number }[]
			).map((row) => ({ month: row.month, revenue: Number(row.revenue) })),
			orderStatuses: (
				statusRows as unknown as { name: string; value: number }[]
			).map((row) => ({ name: row.name, value: Number(row.value) })),
			recentOrders: (
				orderRows as unknown as {
					created_at: string;
					order_number: string;
					status: string;
					total_cents: number;
				}[]
			).map((order) => ({
				createdAt: new Date(order.created_at).toISOString(),
				orderNumber: order.order_number,
				status: order.status,
				totalCents: Number(order.total_cents),
			})),
			posts: (
				postRows as unknown as {
					id: string;
					slug: string;
					status: string;
					title: string;
					updated_at: string;
				}[]
			).map((post) => ({
				id: post.id,
				slug: post.slug,
				status: post.status,
				title: post.title,
				updatedAt: new Date(post.updated_at).toISOString(),
			})),
		};
	},
);

export const createBlogPost = createServerFn({ method: "POST", strict: false })
	.validator((data: unknown) => data)
	.handler(async ({ data }) => {
		const admin = await requireAdmin();
		const input = (data || {}) as Record<string, unknown>;
		const title = asSafeText(input.title, 140);
		const excerpt = asSafeText(input.excerpt, 320);
		const content = asSafeText(input.content, 12_000);
		const coverImageDataUrl = asSafeText(input.coverImageDataUrl, 2_800_000);
		const status = input.status === "published" ? "published" : "draft";
		const slug = slugify(asSafeText(input.slug, 100) || title);
		if (
			title.length < 8 ||
			excerpt.length < 20 ||
			content.length < 80 ||
			slug.length < 3
		) {
			throw new Error(
				"Add a clear title, excerpt, and at least 80 characters of article content.",
			);
		}
		if (
			coverImageDataUrl &&
			!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(
				coverImageDataUrl,
			)
		) {
			throw new Error("The cover image must be a PNG, JPEG, or WebP file.");
		}
		if (/^\s*(import|export)\s/m.test(content)) {
			throw new Error(
				"MDX imports and exports are not supported in blog posts.",
			);
		}
		try {
			await compile(content, { outputFormat: "function-body" });
		} catch {
			throw new Error(
				"The MDX content has a syntax error. Check headings, links, and JSX tags.",
			);
		}
		const sql = await db();
		const id = `post-${crypto.randomUUID()}`;
		try {
			await sql.query(
				`INSERT INTO blog_posts (id, slug, title, excerpt, content, cover_image_url, author_clerk_user_id, status, published_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8 = 'published' THEN NOW() ELSE NULL END)`,
				[
					id,
					slug,
					title,
					excerpt,
					content,
					coverImageDataUrl || null,
					admin.userId,
					status,
				],
			);
			return { id, slug };
		} catch {
			throw new Error(
				"That blog URL is already in use. Choose a different title or slug.",
			);
		}
	});
