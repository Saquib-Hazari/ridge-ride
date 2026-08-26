import { createServerFn } from "@tanstack/react-start";
import { getCatalogPage, getProductBySlug } from "./catalog-repository.server";

function cleanPage(value: unknown): number {
	const page = typeof value === "number" ? value : Number(value);
	return Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
}

function cleanCategory(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const category = value.toLowerCase().trim();
	return ["trail", "enduro", "downhill", "all"].includes(category)
		? category
		: undefined;
}

function cleanSort(value: unknown): "featured" | "high" | "low" {
	return value === "high" || value === "low" ? value : "featured";
}

export const loadCatalog = createServerFn({ method: "GET", strict: false })
	.validator((data: unknown) => data)
	.handler(async ({ data }) => {
		const input = (data || {}) as Record<string, unknown>;
		return getCatalogPage({
			category: cleanCategory(input.category),
			page: cleanPage(input.page),
			sort: cleanSort(input.sort),
		});
	});

export const loadProduct = createServerFn({ method: "GET", strict: false })
	.validator((data: unknown) => data)
	.handler(async ({ data }) => {
		const input = (data || {}) as Record<string, unknown>;
		if (
			typeof input.slug !== "string" ||
			!/^[a-z0-9-]{3,100}$/.test(input.slug)
		) {
			return null;
		}
		return getProductBySlug(input.slug);
	});
