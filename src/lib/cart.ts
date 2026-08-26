export type CartLine = {
	id: string;
	productId: string;
	slug: string;
	name: string;
	image: string;
	imageAlt: string;
	color: string;
	size: string;
	variantId: string;
	unitPriceCents: number;
	quantity: number;
};

const CART_KEY = "ridge-ride-cart-v1";

export function readCart(): CartLine[] {
	if (typeof window === "undefined") return [];
	try {
		const value: unknown = JSON.parse(
			window.localStorage.getItem(CART_KEY) || "[]",
		);
		if (!Array.isArray(value)) return [];
		return value.filter(isCartLine);
	} catch {
		return [];
	}
}

export function writeCart(lines: CartLine[]) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
	window.dispatchEvent(new CustomEvent("ridge-cart-updated"));
}

export function addToCart(line: CartLine) {
	const lines = readCart();
	const existing = lines.find((item) => item.id === line.id);
	if (existing)
		existing.quantity = Math.min(existing.quantity + line.quantity, 99);
	else
		lines.push({ ...line, quantity: Math.min(Math.max(1, line.quantity), 99) });
	writeCart(lines);
}

export function updateCartQuantity(id: string, quantity: number) {
	writeCart(
		readCart().map((line) =>
			line.id === id
				? { ...line, quantity: Math.min(Math.max(1, quantity), 99) }
				: line,
		),
	);
}

export function removeFromCart(id: string) {
	writeCart(readCart().filter((line) => line.id !== id));
}

export function cartTotalCents(lines = readCart()) {
	return lines.reduce(
		(total, line) => total + line.unitPriceCents * line.quantity,
		0,
	);
}

function isCartLine(value: unknown): value is CartLine {
	if (!value || typeof value !== "object") return false;
	const line = value as Partial<CartLine>;
	const hasStrings = [
		"id",
		"productId",
		"slug",
		"name",
		"image",
		"imageAlt",
		"color",
		"size",
		"variantId",
	].every((key) => typeof line[key as keyof CartLine] === "string");
	return (
		hasStrings &&
		typeof line.unitPriceCents === "number" &&
		Number.isInteger(line.unitPriceCents) &&
		line.unitPriceCents >= 0 &&
		typeof line.quantity === "number" &&
		Number.isInteger(line.quantity) &&
		line.quantity > 0
	);
}
