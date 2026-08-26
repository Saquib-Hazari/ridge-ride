import { getClient } from "../../db";
import {
	CATALOG_PAGE_SIZE,
	type CatalogPageData,
	type ProductCard,
	type ProductDetail,
	type ProductImage,
	type ProductReview,
	type ProductVariant,
} from "./domain";

type CardRow = {
	brand: string;
	category: string;
	detail: string;
	id: string;
	image: string | null;
	image_alt: string | null;
	name: string;
	price_cents: number;
	slug: string;
	tag: string;
};

type CountRow = { total: number | string };

type DetailRow = CardRow & {
	brake_system: string;
	description: string;
	frame_material: string;
	travel_mm: number;
	wheel_size: string;
};

type VariantRow = {
	color_hex: string;
	color_name: string;
	frame_size: string;
	id: string;
	price_cents: number;
	sku: string;
	stock_quantity: number;
};

type ImageRow = {
	alt_text: string;
	color_name: string | null;
	height: number;
	id: string;
	image_url: string;
	width: number;
};

type ReviewRow = {
	body: string;
	created_at: string | Date;
	id: string;
	is_verified_purchase: boolean;
	rating: number;
	reviewer_avatar_url: string | null;
	reviewer_name: string;
	title: string;
};

function toCard(row: CardRow): ProductCard {
	return {
		brand: row.brand,
		category: row.category,
		detail: row.detail,
		id: row.id,
		image: row.image || "/images/mtb-trail-studio.png",
		imageAlt: row.image_alt || `${row.name} mountain bike`,
		name: row.name,
		priceCents: row.price_cents,
		slug: row.slug,
		tag: row.tag,
	};
}

async function database() {
	const client = await getClient();
	if (!client) {
		throw new Error(
			"The catalogue is unavailable because DATABASE_URL is not configured.",
		);
	}
	return client;
}

export async function getCatalogPage(input: {
	category?: string;
	page?: number;
	sort?: "featured" | "high" | "low";
}): Promise<CatalogPageData> {
	const page = Math.max(1, Math.floor(input.page || 1));
	const category = input.category?.toLowerCase();
	const sort =
		input.sort === "low" || input.sort === "high" ? input.sort : "featured";
	const orderBy =
		sort === "low"
			? "p.price_cents ASC, p.featured_rank ASC"
			: sort === "high"
				? "p.price_cents DESC, p.featured_rank ASC"
				: "p.featured_rank ASC, p.created_at DESC";
	const offset = (page - 1) * CATALOG_PAGE_SIZE;
	const sql = await database();
	const filters = category && category !== "all" ? "AND c.slug = $1" : "";
	const params =
		category && category !== "all"
			? [category, CATALOG_PAGE_SIZE, offset]
			: [CATALOG_PAGE_SIZE, offset];
	const parameterOffset = category && category !== "all" ? 1 : 0;
	const rows = (await sql.query(
		`SELECT p.id, p.slug, p.name, b.name AS brand, c.slug AS category,
		        p.price_cents, p.short_description AS detail,
		        c.name || ' / ' || p.travel_mm || ' mm' AS tag,
		        image.image_url AS image, image.alt_text AS image_alt
		 FROM products p
		 JOIN brands b ON b.id = p.brand_id
		 JOIN categories c ON c.id = p.category_id
		 LEFT JOIN LATERAL (
		   SELECT image_url, alt_text FROM product_images
		   WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1
		 ) image ON TRUE
		 WHERE p.status = 'active' ${filters}
		 ORDER BY ${orderBy}
		 LIMIT $${parameterOffset + 1} OFFSET $${parameterOffset + 2}`,
		params,
	)) as CardRow[];
	const countRows = (await sql.query(
		`SELECT COUNT(*)::int AS total
		 FROM products p JOIN categories c ON c.id = p.category_id
		 WHERE p.status = 'active' ${filters}`,
		category && category !== "all" ? [category] : [],
	)) as CountRow[];
	const total = Number(countRows[0]?.total || 0);
	return {
		items: rows.map(toCard),
		page,
		pageCount: Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE)),
		pageSize: CATALOG_PAGE_SIZE,
		total,
	};
}

export async function getProductBySlug(
	slug: string,
): Promise<ProductDetail | null> {
	const sql = await database();
	const products = (await sql.query(
		`SELECT p.id, p.slug, p.name, b.name AS brand, c.slug AS category,
		        p.price_cents, p.short_description AS detail,
		        c.name || ' / ' || p.travel_mm || ' mm' AS tag,
		        p.description, p.wheel_size, p.frame_material, p.travel_mm, p.brake_system,
		        image.image_url AS image, image.alt_text AS image_alt
		 FROM products p
		 JOIN brands b ON b.id = p.brand_id
		 JOIN categories c ON c.id = p.category_id
		 LEFT JOIN LATERAL (
		   SELECT image_url, alt_text FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1
		 ) image ON TRUE
		 WHERE p.status = 'active' AND p.slug = $1
		 LIMIT 1`,
		[slug],
	)) as DetailRow[];
	const row = products[0];
	if (!row) return null;
	const [variantRows, imageRows, reviewRows] = await Promise.all([
		(async () =>
			(await sql.query(
				`SELECT id, sku, color_name, color_hex, frame_size, price_cents, stock_quantity
			 FROM product_variants WHERE product_id = $1 AND is_active = TRUE
			 ORDER BY color_name, CASE frame_size WHEN 'S' THEN 1 WHEN 'M' THEN 2 WHEN 'L' THEN 3 ELSE 4 END`,
				[row.id],
			)) as unknown as VariantRow[])(),
		(async () =>
			(await sql.query(
				`SELECT i.id, i.image_url, i.alt_text, i.width, i.height, v.color_name
			 FROM product_images i LEFT JOIN product_variants v ON v.id = i.variant_id
			 WHERE i.product_id = $1 ORDER BY i.sort_order, i.id`,
				[row.id],
			)) as unknown as ImageRow[])(),
		(async () =>
			(await sql.query(
				`SELECT id, reviewer_name, reviewer_avatar_url, rating, title, body, is_verified_purchase, created_at
			 FROM reviews WHERE product_id = $1 AND status = 'published' ORDER BY created_at DESC LIMIT 12`,
				[row.id],
			)) as unknown as ReviewRow[])(),
	]);
	const reviews: ProductReview[] = reviewRows.map((review) => ({
		avatarUrl: review.reviewer_avatar_url,
		body: review.body,
		createdAt: new Date(review.created_at).toISOString(),
		id: review.id,
		isVerifiedPurchase: review.is_verified_purchase,
		rating: review.rating,
		reviewerName: review.reviewer_name,
		title: review.title,
	}));
	return {
		...toCard(row),
		brakeSystem: row.brake_system,
		description: row.description,
		frameMaterial: row.frame_material,
		images: imageRows.map(
			(image): ProductImage => ({
				alt: image.alt_text,
				colorName: image.color_name,
				height: image.height,
				id: image.id,
				url: image.image_url,
				width: image.width,
			}),
		),
		reviewCount: reviews.length,
		reviewRating:
			reviews.length > 0
				? reviews.reduce((total, review) => total + review.rating, 0) /
					reviews.length
				: null,
		reviews,
		travelMm: row.travel_mm,
		variants: variantRows.map(
			(variant): ProductVariant => ({
				colorHex: variant.color_hex,
				colorName: variant.color_name,
				frameSize: variant.frame_size,
				id: variant.id,
				priceCents: variant.price_cents,
				sku: variant.sku,
				stockQuantity: variant.stock_quantity,
			}),
		),
		wheelSize: row.wheel_size,
	};
}
