export const CATALOG_PAGE_SIZE = 20;

export type ProductCard = {
	brand: string;
	category: string;
	detail: string;
	id: string;
	image: string;
	imageAlt: string;
	name: string;
	priceCents: number;
	slug: string;
	tag: string;
};

export type ProductVariant = {
	colorHex: string;
	colorName: string;
	frameSize: string;
	id: string;
	priceCents: number;
	sku: string;
	stockQuantity: number;
};

export type ProductImage = {
	alt: string;
	colorName: string | null;
	height: number;
	id: string;
	url: string;
	width: number;
};

export type ProductReview = {
	avatarUrl: string | null;
	body: string;
	createdAt: string;
	id: string;
	isVerifiedPurchase: boolean;
	rating: number;
	reviewerName: string;
	title: string;
};

export type ProductDetail = ProductCard & {
	brakeSystem: string;
	description: string;
	frameMaterial: string;
	images: ProductImage[];
	reviewCount: number;
	reviewRating: number | null;
	reviews: ProductReview[];
	travelMm: number;
	variants: ProductVariant[];
	wheelSize: string;
};

export type CatalogPageData = {
	items: ProductCard[];
	page: number;
	pageCount: number;
	pageSize: number;
	total: number;
};

export function formatCurrency(cents: number): string {
	return new Intl.NumberFormat("en-US", {
		currency: "USD",
		maximumFractionDigits: 0,
		style: "currency",
	}).format(cents / 100);
}
