import { useUser } from "@clerk/tanstack-react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
	ArrowRight,
	Check,
	ChevronRight,
	Filter,
	Heart,
	LogIn,
	MapPin,
	Minus,
	Plus,
	ShieldCheck,
	ShoppingBag,
	SlidersHorizontal,
	Star,
	Wrench,
} from "lucide-react";
import {
	type FormEvent,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type {
	CatalogPageData,
	ProductCard,
	ProductDetail,
	ProductVariant,
} from "../features/catalog/domain";
import {
	createRazorpayOrder,
	recordPaymentFailure,
	verifyRazorpayPayment,
} from "../features/commerce/commerce-server";
import {
	submitContactMessage,
	submitServiceBooking,
} from "../features/forms/forms-server";
import {
	addToCart,
	type CartLine,
	cartTotalCents,
	readCart,
	removeFromCart,
	updateCartQuantity,
} from "../lib/cart";
import { AuthActions } from "./auth-actions";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type CatalogKind = "bikes" | "gear" | "apparel";
type StoreProduct = {
	id: string;
	slug: string;
	category: string;
	brand: string;
	name: string;
	price: number;
	image: string;
	imageAlt: string;
	tag: string;
	detail: string;
};

declare global {
	interface Window {
		Razorpay?: new (options: {
			amount: number;
			currency: string;
			description: string;
			handler: (response: {
				razorpay_order_id: string;
				razorpay_payment_id: string;
				razorpay_signature: string;
			}) => void;
			key: string;
			name: string;
			order_id: string;
			prefill: { contact: string; email: string; name: string };
			theme: { color: string };
		}) => {
			on: (event: "payment.failed", handler: () => void) => void;
			open: () => void;
		};
	}
}

function loadRazorpay() {
	if (typeof window === "undefined")
		return Promise.reject(
			new Error("Payment is only available in the browser."),
		);
	if (window.Razorpay) return Promise.resolve();
	return new Promise<void>((resolve, reject) => {
		const script = document.createElement("script");
		script.src = "https://checkout.razorpay.com/v1/checkout.js";
		script.onload = () => resolve();
		script.onerror = () =>
			reject(new Error("Payment checkout could not load."));
		document.head.appendChild(script);
	});
}

const bikes: StoreProduct[] = [
	{
		id: "bike-trail",
		slug: "alpine-trail-29",
		category: "trail",
		brand: "Ridge & Ride",
		name: "Alpine Trail 29",
		price: 3899,
		image: "/images/mtb-trail-studio.png",
		imageAlt: "Full-suspension trail mountain bike",
		tag: "Trail / 140 mm",
		detail:
			"Balanced climbing position, 29-inch wheels, and confidence for technical all-day rides.",
	},
	{
		id: "bike-enduro",
		slug: "northline-enduro",
		category: "enduro",
		brand: "Ridge & Ride",
		name: "Northline Enduro",
		price: 4799,
		image: "/images/mtb-enduro-studio.png",
		imageAlt: "Long-travel enduro mountain bike",
		tag: "Enduro / 160 mm",
		detail:
			"Long-travel control for steep terrain without giving away climbing efficiency.",
	},
	{
		id: "bike-dh",
		slug: "summit-park",
		category: "downhill",
		brand: "Ridge & Ride",
		name: "Summit Park",
		price: 5249,
		image: "/images/mtb-downhill-studio.png",
		imageAlt: "Downhill mountain bike with dual-crown fork",
		tag: "Downhill / 200 mm",
		detail:
			"A planted bike-park platform for repeated laps, high speeds, and committed lines.",
	},
];

const gear: StoreProduct[] = [
	{
		id: "gear-helmet",
		slug: "lineguard-full-face",
		category: "protection",
		brand: "Ridge & Ride",
		name: "Lineguard Full Face",
		price: 249,
		image: "/images/catalog-gear-hero.png",
		imageAlt: "Black full-face mountain bike helmet",
		tag: "Protection",
		detail:
			"A full-coverage trail helmet with removable, washable padding and generous ventilation.",
	},
	{
		id: "gear-pedal",
		slug: "granite-flat-pedals",
		category: "components",
		brand: "Ridge & Ride",
		name: "Granite Flat Pedals",
		price: 119,
		image: "/images/catalog-gear-hero.png",
		imageAlt: "Mountain bike flat pedals on workshop bench",
		tag: "Components",
		detail:
			"Wide alloy platforms with replaceable pins for predictable grip and serviceability.",
	},
	{
		id: "gear-pack",
		slug: "ridge-hydration-12",
		category: "accessories",
		brand: "Ridge & Ride",
		name: "Ridge Hydration 12",
		price: 139,
		image: "/images/catalog-gear-hero.png",
		imageAlt: "Mountain bike hydration pack",
		tag: "Accessories",
		detail:
			"A stable trail pack with room for water, tools, a shell, and essential ride supplies.",
	},
];

const apparel: StoreProduct[] = [
	{
		id: "app-jersey",
		slug: "switchback-jersey",
		category: "jerseys",
		brand: "Ridge & Ride",
		name: "Switchback Jersey",
		price: 84,
		image: "/images/catalog-apparel-hero.png",
		imageAlt: "Mountain bike riders wearing technical trail jerseys",
		tag: "Jerseys",
		detail:
			"A breathable trail jersey with a relaxed riding cut and room for light protection.",
	},
	{
		id: "app-pant",
		slug: "northline-trail-pant",
		category: "pants",
		brand: "Ridge & Ride",
		name: "Northline Trail Pant",
		price: 149,
		image: "/images/catalog-apparel-hero.png",
		imageAlt: "Riders wearing technical mountain bike pants",
		tag: "Pants",
		detail:
			"Durable four-way stretch fabric with a tapered fit designed around knee pads.",
	},
	{
		id: "app-glove",
		slug: "granite-trail-glove",
		category: "gloves",
		brand: "Ridge & Ride",
		name: "Granite Trail Glove",
		price: 44,
		image: "/images/catalog-apparel-hero.png",
		imageAlt: "Mountain bike rider wearing trail gloves",
		tag: "Gloves",
		detail:
			"Low-bulk palm feel, reinforced contact zones, and touchscreen-compatible fingertips.",
	},
];

const catalogs = { bikes, gear, apparel };

const catalogConfig = {
	bikes: {
		eyebrow: "Mountain bikes",
		title: "Find the bike that fits your terrain.",
		summary:
			"Trail, enduro, and downhill bikes solve different problems. Compare travel, wheel format, fit, and intended terrain here, then use a fitting appointment when geometry numbers alone do not answer the decision.",
		hero: "/images/catalog-bikes-hero.png",
		heroAlt: "Mountain biker carving a forest berm",
		categories: ["All", "Trail", "Enduro", "Downhill"],
	},
	gear: {
		eyebrow: "Parts & gear",
		title: "Dial the bike. Protect the ride.",
		summary:
			"Shop components, protection, tools, and ride essentials chosen for mountain-bike use. Compatibility depends on the exact bike, model year, and component standard, so contact the workshop before ordering when fitment is uncertain.",
		hero: "/images/catalog-gear-hero.png",
		heroAlt: "Mountain bike protection and tools arranged in a workshop",
		categories: ["All", "Components", "Protection", "Accessories"],
	},
	apparel: {
		eyebrow: "Apparel",
		title: "Technical layers made to move.",
		summary:
			"Explore mountain-bike jerseys, pants, gloves, and protection by fit and conditions. Product measurements are more reliable than a usual clothing size, so compare the size guide before choosing.",
		hero: "/images/catalog-apparel-hero.png",
		heroAlt: "Mountain bike riders wearing technical riding apparel",
		categories: ["All", "Jerseys", "Pants", "Gloves"],
	},
};

function currency(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(value);
}

export function PageFrame({
	children,
	eyebrow,
	title,
	summary,
	image,
	imageAlt,
	heroActions,
	hideHero = false,
	noIndex = false,
}: {
	children: ReactNode;
	eyebrow: string;
	title: string;
	summary: string;
	image?: string;
	imageAlt?: string;
	heroActions?: ReactNode;
	hideHero?: boolean;
	noIndex?: boolean;
}) {
	const pageRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		gsap.registerPlugin(ScrollTrigger);
		const context = gsap.context(() => {
			gsap.from(".store-hero-copy > *", {
				opacity: 0,
				y: 24,
				duration: 0.7,
				stagger: 0.08,
				ease: "power3.out",
			});
			gsap.utils
				.toArray<HTMLElement>(".store-page .section")
				.forEach((element) => {
					gsap.from(element, {
						opacity: 0,
						y: 32,
						duration: 0.7,
						ease: "power3.out",
						scrollTrigger: { trigger: element, start: "top 90%", once: true },
					});
				});
		}, pageRef);
		return () => context.revert();
	}, []);
	return (
		<div
			className="store-page"
			data-noindex={noIndex || undefined}
			ref={pageRef}
		>
			<a className="skip-link" href="#main-content">
				Skip to content
			</a>
			<SiteHeader />
			<main id="main-content">
				{hideHero ? null : (
					<section className={`store-hero${image ? " store-hero-image" : ""}`}>
						{image ? (
							<img alt={imageAlt || ""} height="941" src={image} width="1672" />
						) : null}
						<div className="store-hero-shade" />
						<div className="page-width store-hero-copy">
							<nav aria-label="Breadcrumb">
								<Link to="/">Home</Link>
								<ChevronRight /> <span>{eyebrow}</span>
							</nav>
							<p className="eyebrow">{eyebrow}</p>
							<h1>{title}</h1>
							<p>{summary}</p>
							{heroActions ? (
								<div className="store-hero-actions">{heroActions}</div>
							) : null}
						</div>
					</section>
				)}
				{children}
			</main>
			<SiteFooter />
		</div>
	);
}

export function CatalogPage({
	kind,
	title: _title,
	products: databaseProducts,
	pagination,
}: {
	kind: CatalogKind;
	title: string;
	products?: ProductCard[];
	pagination?: CatalogPageData;
}) {
	const config = catalogConfig[kind];
	const products = databaseProducts || catalogs[kind];
	const [active, setActive] = useState("All");
	const [sort, setSort] = useState("featured");
	const visible = useMemo(() => {
		const next =
			active === "All"
				? products
				: products.filter((p) => p.category === active.toLowerCase());
		return sort === "low"
			? [...next].sort((a, b) => productPrice(a) - productPrice(b))
			: sort === "high"
				? [...next].sort((a, b) => productPrice(b) - productPrice(a))
				: next;
	}, [active, products, sort]);
	return (
		<PageFrame
			eyebrow={config.eyebrow}
			image={config.hero}
			imageAlt={config.heroAlt}
			summary={config.summary}
			title={config.title}
		>
			<section className="section section-contrast">
				<div className="page-width catalog-toolbar">
					<div>
						<p className="eyebrow">Shop by category</p>
						<fieldset className="category-tabs">
							<legend className="sr-only">Product category</legend>
							{config.categories.map((c) => (
								<button
									aria-pressed={active === c}
									key={c}
									onClick={() => setActive(c)}
									type="button"
								>
									{c}
								</button>
							))}
						</fieldset>
					</div>
					<label className="catalog-sort">
						Sort{" "}
						<select onChange={(e) => setSort(e.target.value)} value={sort}>
							<option value="featured">Featured</option>
							<option value="low">Price: low to high</option>
							<option value="high">Price: high to low</option>
						</select>
					</label>
				</div>
				<div className="page-width catalog-results">
					<aside className="catalog-guide">
						<Filter />
						<p>
							{kind === "bikes"
								? "Start with terrain, then confirm reach, stack, and suspension travel."
								: kind === "gear"
									? "Confirm model year and component standards before ordering fit-sensitive parts."
									: "Compare garment measurements and intended fit before choosing a size."}
						</p>
						<Link to={kind === "apparel" ? "/policies" : "/service"}>
							{kind === "apparel" ? "Read the size guide" : "Ask the workshop"}{" "}
							<ArrowRight />
						</Link>
					</aside>
					<div>
						<div className="catalog-count">
							<span>{pagination?.total || visible.length} products</span>
							<button type="button">
								<SlidersHorizontal /> Filters
							</button>
						</div>
						<div className="store-product-grid">
							{visible.map((p) => (
								<StoreProductCard key={p.id} product={p} />
							))}
						</div>
						{pagination && pagination.pageCount > 1 ? (
							<nav aria-label="Catalogue pages" className="catalog-pagination">
								{pagination.page > 1 ? (
									<Link
										search={{ page: pagination.page - 1 }}
										to="/mountain-bikes"
									>
										Previous
									</Link>
								) : null}
								<span>
									Page {pagination.page} of {pagination.pageCount}
								</span>
								{pagination.page < pagination.pageCount ? (
									<Link
										search={{ page: pagination.page + 1 }}
										to="/mountain-bikes"
									>
										Next
									</Link>
								) : null}
							</nav>
						) : null}
					</div>
				</div>
			</section>
			<CatalogEditorial kind={kind} />
		</PageFrame>
	);
}

function CatalogEditorial({ kind }: { kind: CatalogKind }) {
	const content =
		kind === "bikes"
			? {
					eyebrow: "Choose by terrain",
					title: "Trail speed, enduro control, or park focus?",
					copy: "Trail bikes balance long climbs with technical descents. Enduro bikes add travel and descending stability for steeper lines. Downhill bikes prioritize lift-accessed terrain and repeated park laps. Wheel size, reach, stack, and suspension setup shape the ride as much as the category name.",
					points: [
						[
							"Trail",
							"Efficient all-day geometry with versatile suspension travel.",
						],
						[
							"Enduro",
							"More descending control while remaining practical to pedal.",
						],
						["Downhill", "Maximum travel and stability for bike-park terrain."],
					],
				}
			: kind === "gear"
				? {
						eyebrow: "Compatibility first",
						title: "The right part starts with the right standard.",
						copy: "Before ordering a fit-sensitive part, confirm the bike model, model year, wheel size, axle spacing, brake mount, rotor size, drivetrain speed, and manufacturer guidance. A familiar product name is not proof of compatibility.",
						points: [
							[
								"Components",
								"Pedals, controls, drivetrain, braking, and cockpit parts.",
							],
							[
								"Protection",
								"Helmets and body protection chosen by fit and intended use.",
							],
							[
								"Tools & care",
								"Trail tools, cleaners, lubricants, and workshop essentials.",
							],
						],
					}
				: {
						eyebrow: "Fit for the ride",
						title: "Build a kit around movement and conditions.",
						copy: "Use garment measurements rather than relying only on your everyday size. Consider riding position, knee-pad room, temperature, layering, and return conditions before choosing. Protection claims are shown only when supplied by a verified manufacturer.",
						points: [
							["Jerseys", "Breathable layers with room to move on the bike."],
							[
								"Pants & shorts",
								"Durable riding cuts designed around pedalling and pads.",
							],
							["Gloves", "Low-bulk contact, grip, and coverage for trail use."],
						],
					};
	return (
		<>
			<section className="section page-width editorial-split">
				<div>
					<p className="eyebrow">{content.eyebrow}</p>
					<h2>{content.title}</h2>
				</div>
				<div>
					<p>{content.copy}</p>
					<Link
						className="text-link"
						to={kind === "apparel" ? "/policies" : "/service"}
					>
						{kind === "apparel"
							? "Open size guidance"
							: "Ask for expert advice"}
						<ArrowRight />
					</Link>
				</div>
			</section>
			<section className="section section-contrast">
				<div className="page-width category-explain-grid">
					{content.points.map(([title, copy], index) => (
						<article key={title}>
							<span>0{index + 1}</span>
							<h2>{title}</h2>
							<p>{copy}</p>
						</article>
					))}
				</div>
			</section>
		</>
	);
}

function productPrice(product: StoreProduct | ProductCard) {
	return "priceCents" in product ? product.priceCents / 100 : product.price;
}

function getVariant(
	variants: ProductVariant[],
	colorName: string,
	frameSize: string,
) {
	return variants.find(
		(variant) =>
			variant.colorName === colorName && variant.frameSize === frameSize,
	);
}

function StoreProductCard({
	product,
}: {
	product: StoreProduct | ProductCard;
}) {
	return (
		<article className="store-product-card">
			<Link
				params={{ category: product.category, slug: product.slug }}
				to="/mountain-bikes/$category/$slug"
			>
				<div className="store-product-media">
					<img
						alt={product.imageAlt}
						height="1254"
						loading="lazy"
						src={product.image}
						width="1254"
					/>
					<span>In stock</span>
				</div>
				<p className="eyebrow">{product.tag}</p>
				<h2>{product.name}</h2>
				<p>{product.detail}</p>
				<strong>{currency(productPrice(product))}</strong>
				<span className="product-link">
					View product <ArrowRight />
				</span>
			</Link>
		</article>
	);
}

export function ProductPage({ product }: { product: ProductDetail }) {
	const navigate = useNavigate();
	const { isSignedIn } = useUser();
	const colors = Array.from(
		new Set(product.variants.map((variant) => variant.colorName)),
	);
	const [color, setColor] = useState(colors[0] || "");
	const sizes = Array.from(
		new Set(
			product.variants
				.filter((variant) => variant.colorName === color)
				.map((variant) => variant.frameSize),
		),
	);
	const [size, setSize] = useState(
		sizes.find(
			(value) => getVariant(product.variants, color, value)?.stockQuantity,
		) || "",
	);
	const [qty, setQty] = useState(1);
	const [status, setStatus] = useState("");
	const selectedVariant = getVariant(product.variants, color, size);
	const colorImage =
		product.images.find((image) => image.colorName === color) ||
		product.images[0];
	const selectedImage = colorImage || {
		alt: product.imageAlt,
		height: 1254,
		id: "fallback",
		url: product.image,
		width: 1254,
	};
	const maxQuantity = selectedVariant?.stockQuantity || 0;

	function chooseColor(nextColor: string) {
		setColor(nextColor);
		const nextSize = product.variants
			.filter(
				(variant) =>
					variant.colorName === nextColor && variant.stockQuantity > 0,
			)
			.map((variant) => variant.frameSize)[0];
		setSize(nextSize || "");
		setQty(1);
		setStatus("");
	}
	return (
		<PageFrame
			eyebrow={product.category}
			hideHero
			summary={product.detail}
			title={product.name}
		>
			<section className="section section-contrast product-commerce">
				<div className="page-width product-breadcrumb">
					<Link to="/">Home</Link>
					<ChevronRight />
					<Link search={{ page: 1 }} to="/mountain-bikes">
						Bikes
					</Link>
					<ChevronRight />
					<span>{product.name}</span>
				</div>
				<div className="page-width product-detail">
					<div className="product-gallery">
						<div className="product-gallery-main">
							<img
								alt={selectedImage.alt}
								height={selectedImage.height}
								src={selectedImage.url}
								width={selectedImage.width}
							/>
						</div>
						<fieldset className="product-thumbs">
							<legend className="sr-only">Product images</legend>
							{product.images.slice(0, 4).map((image) => (
								<button
									aria-label={`View ${image.alt}`}
									key={image.id}
									type="button"
								>
									<img alt="" src={image.url} />
								</button>
							))}
						</fieldset>
					</div>
					<div className="purchase-panel">
						<p className="eyebrow">{product.brand}</p>
						<h1>{product.name}</h1>
						<p className="purchase-price">
							{currency(
								(selectedVariant?.priceCents || product.priceCents) / 100,
							)}
						</p>
						<p className="stock-line">
							<Check />{" "}
							{maxQuantity > 0 ? `${maxQuantity} in stock` : "Out of stock"}
						</p>
						<fieldset>
							<legend>Select color: {color}</legend>
							<div className="color-row">
								{colors.map((value) => {
									const colorVariant = product.variants.find(
										(variant) => variant.colorName === value,
									);
									return (
										<button
											aria-label={value}
											aria-pressed={color === value}
											key={value}
											onClick={() => chooseColor(value)}
											style={{ backgroundColor: colorVariant?.colorHex }}
											type="button"
										/>
									);
								})}
							</div>
						</fieldset>
						<fieldset>
							<legend>Frame size</legend>
							<div className="variant-row">
								{sizes.map((v) => {
									const variant = getVariant(product.variants, color, v);
									const unavailable = !variant || variant.stockQuantity === 0;
									return (
										<button
											aria-pressed={size === v}
											disabled={unavailable}
											key={v}
											onClick={() => setSize(v)}
											type="button"
										>
											{v}
										</button>
									);
								})}
							</div>
						</fieldset>
						<Link className="size-link" to="/policies">
							Size and geometry guide <ArrowRight />
						</Link>
						<div className="product-buy-row">
							<div className="quantity">
								<button
									aria-label="Decrease quantity"
									onClick={() => setQty(Math.max(1, qty - 1))}
									type="button"
								>
									<Minus />
								</button>
								<span>{qty}</span>
								<button
									aria-label="Increase quantity"
									disabled={qty >= maxQuantity}
									onClick={() => setQty(Math.min(maxQuantity, qty + 1))}
									type="button"
								>
									<Plus />
								</button>
							</div>
							<button
								className="button button-primary add-cart"
								disabled={!size || maxQuantity === 0}
								onClick={() => {
									if (!isSignedIn) {
										navigate({ to: "/sign-in" });
										return;
									}
									if (!selectedVariant) return;
									addToCart({
										color,
										image: selectedImage.url,
										imageAlt: selectedImage.alt,
										id: selectedVariant.id,
										name: product.name,
										productId: product.id,
										quantity: qty,
										size,
										slug: product.slug,
										unitPriceCents: selectedVariant.priceCents,
										variantId: selectedVariant.id,
									});
									setStatus(
										`${qty} ${product.name}, ${color}, size ${size}, added to your cart.`,
									);
								}}
								type="button"
							>
								Add to cart <ShoppingBag />
							</button>
						</div>
						<Link className="product-fit-cta" to="/service">
							Book a bike fit <ArrowRight />
						</Link>
						<button className="wishlist-action" type="button">
							<Heart /> Save this bike
						</button>
						<output
							aria-live="polite"
							className={
								/could not|invalid|available|error/i.test(status)
									? "form-status is-error"
									: "form-status"
							}
						>
							{status}
						</output>
						<div className="purchase-support">
							<span>
								<ShieldCheck /> Price and stock confirmed before payment
							</span>
							<span>
								<Wrench /> Professional fitting available
							</span>
						</div>
					</div>
				</div>
			</section>
			<section className="section product-accordions">
				<div className="page-width product-info-inner">
					<details open>
						<summary>Overview</summary>
						<p>
							{product.description} Final fit depends on reach, stack,
							wheelbase, rider preference, and terrain.
						</p>
					</details>
					<details>
						<summary>Specifications</summary>
						<table>
							<tbody>
								<tr>
									<th scope="row">Wheel size</th>
									<td>{product.wheelSize}</td>
								</tr>
								<tr>
									<th scope="row">Frame</th>
									<td>{product.frameMaterial}</td>
								</tr>
								<tr>
									<th scope="row">Suspension</th>
									<td>{product.travelMm} mm</td>
								</tr>
								<tr>
									<th scope="row">Brakes</th>
									<td>{product.brakeSystem}</td>
								</tr>
							</tbody>
						</table>
					</details>
					<details>
						<summary>Geometry</summary>
						<p>
							Smaller sizes feel easier to move beneath the rider; larger sizes
							add room and stability. Use published measurements as a starting
							point, then confirm with a fitting conversation.
						</p>
					</details>
					<details>
						<summary>Shipping & returns</summary>
						<p>
							Delivery cost, timing, assembly requirements, and return
							eligibility are confirmed during checkout. Review the current
							policy before payment.
						</p>
					</details>
				</div>
			</section>
			<section className="section section-contrast">
				<div className="page-width">
					<div className="section-heading row-heading">
						<div>
							<p className="eyebrow">Complete the setup</p>
							<h2>Essential trail gear.</h2>
						</div>
						<Link className="text-link" to="/parts-gear">
							Shop all gear <ArrowRight />
						</Link>
					</div>
					<div className="store-product-grid">
						{gear.map((item) => (
							<StoreProductCard key={item.id} product={item} />
						))}
					</div>
				</div>
			</section>
			<section className="section product-review-empty">
				<div className="page-width review-layout">
					<div>
						<p className="eyebrow">Customer reviews</p>
						<h2>
							{product.reviewRating
								? `${product.reviewRating.toFixed(1)} out of 5`
								: "No reviews yet."}
						</h2>
						<p>
							{product.reviewCount > 0
								? `${product.reviewCount} verified rider${product.reviewCount === 1 ? "" : "s"} shared feedback on this bike.`
								: "Ratings will appear here after verified customers share feedback."}
						</p>
					</div>
					<div>
						{product.reviews.length > 0 ? (
							<div className="review-list">
								{product.reviews.map((review) => (
									<article key={review.id}>
										{review.avatarUrl ? (
											<img
												alt=""
												height="48"
												src={review.avatarUrl}
												width="48"
											/>
										) : (
											<span
												aria-hidden="true"
												className="review-avatar-fallback"
											>
												{review.reviewerName.slice(0, 1)}
											</span>
										)}
										<div>
											<strong>{review.reviewerName}</strong>
											<span
												className="review-stars"
												role="img"
												aria-label={`${review.rating} out of 5 stars`}
											>
												{[1, 2, 3, 4, 5].map((star) => (
													<Star
														fill={
															star <= review.rating ? "currentColor" : "none"
														}
														key={`star-${star}`}
													/>
												))}
											</span>
											<h3>{review.title}</h3>
											<p>{review.body}</p>
											{review.isVerifiedPurchase ? (
												<small>Verified purchase</small>
											) : null}
										</div>
									</article>
								))}
							</div>
						) : (
							<p>
								Only signed-in customers with a verified purchase will be able
								to submit a review.
							</p>
						)}
					</div>
				</div>
			</section>
			<section className="section page-width">
				<div className="section-heading">
					<p className="eyebrow">Similar rides</p>
					<h2>Compare the range.</h2>
				</div>
				<div className="store-product-grid">
					{bikes
						.filter((item) => item.id !== product.id)
						.map((item) => (
							<StoreProductCard key={item.id} product={item} />
						))}
				</div>
			</section>
		</PageFrame>
	);
}

export function ServicePage() {
	const [state, setState] = useState("");
	async function submit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setState("Submitting…");
		try {
			const form = new FormData(e.currentTarget);
			await submitServiceBooking({ data: Object.fromEntries(form.entries()) });
			setState(
				"Request received. The workshop will confirm scope, timing, and availability before booking.",
			);
			e.currentTarget.reset();
		} catch (error) {
			setState(
				error instanceof Error
					? error.message
					: "We could not submit the request.",
			);
		}
	}
	return (
		<PageFrame
			eyebrow="Workshop support"
			heroActions={
				<>
					<a className="button button-primary" href="#packages">
						View packages <ArrowRight />
					</a>
					<a className="service-hero-link" href="#booking">
						Book now
					</a>
				</>
			}
			image="/images/workshop-service-banner.png"
			imageAlt="Mechanic servicing a mountain bike"
			summary="From seasonal tune-ups to suspension work and fit checks, tell us what the bike needs. The workshop confirms scope, availability, and pricing before any request becomes a booking."
			title="Service built for big days."
		>
			<section className="service-proof-band">
				<div className="page-width service-proofs">
					<article>
						<Wrench />
						<div>
							<strong>Experienced mechanics</strong>
							<span>Practical mountain-bike workshop support</span>
						</div>
					</article>
					<article>
						<SlidersHorizontal />
						<div>
							<strong>Clear turnaround guidance</strong>
							<span>Timing confirmed after inspection</span>
						</div>
					</article>
					<article>
						<ShieldCheck />
						<div>
							<strong>Rider-tested advice</strong>
							<span>Setup decisions explained clearly</span>
						</div>
					</article>
				</div>
			</section>
			<section className="section page-width service-menu" id="packages">
				<div>
					<p className="eyebrow">The workshop</p>
					<h2>Service packages.</h2>
					<p>
						Every request begins with an inspection. The workshop confirms
						included work, exclusions, required parts, turnaround, and price
						before service begins.
					</p>
				</div>
				<div className="service-menu-list">
					{[
						[
							"Safety check",
							[
								"Control and fastener check",
								"Drivetrain lubrication",
								"Tire pressure and wheel inspection",
							],
						],
						[
							"Performance tune",
							[
								"Detailed drivetrain clean",
								"Brake and gear adjustment",
								"Wheel and bearing assessment",
							],
						],
						[
							"Full overhaul",
							[
								"Complete inspection and strip-down plan",
								"Bearing and cable assessment",
								"Final setup and test",
							],
						],
					].map(([name, items]) => (
						<article key={String(name)}>
							<h3>{String(name)}</h3>
							<ul>
								{(items as string[]).map((item) => (
									<li key={item}>
										<Check />
										{item}
									</li>
								))}
							</ul>
							<a href="#booking">
								Select package <ArrowRight />
							</a>
						</article>
					))}
				</div>
			</section>
			<section className="section section-contrast">
				<div className="page-width supporting-services">
					<article>
						<p className="eyebrow">Suspension lab</p>
						<h2>Fork and shock support.</h2>
						<p>
							Setup, air-sleeve and seal-service requests are assessed against
							the exact component and available service parts.
						</p>
					</article>
					<article>
						<p className="eyebrow">Custom builds</p>
						<h2>From frame to finished bike.</h2>
						<p>
							Start with intended terrain, fit, budget, and compatibility. The
							workshop confirms every standard before sourcing parts.
						</p>
					</article>
				</div>
			</section>
			<section className="section page-width service-booking" id="booking">
				<div>
					<p className="eyebrow">Request a booking</p>
					<h2>Tell us about your bike.</h2>
					<p>
						Submitting this form starts a conversation; it does not reserve a
						date or authorize work.
					</p>
				</div>
				<form onSubmit={submit}>
					<label>
						Name
						<input autoComplete="name" name="name" required />
					</label>
					<label>
						Email
						<input autoComplete="email" name="email" required type="email" />
					</label>
					<label>
						Phone
						<input autoComplete="tel" name="phone" type="tel" />
					</label>
					<label>
						Bike and model
						<input name="bike" required />
					</label>
					<label>
						Requested service
						<select name="service" required>
							<option value="">Choose a service</option>
							<option>Inspection and tune</option>
							<option>Suspension support</option>
							<option>Fit and setup</option>
						</select>
					</label>
					<label>
						Preferred date
						<input name="date" type="date" />
					</label>
					<label className="form-wide">
						Notes
						<textarea name="notes" rows={4} />
					</label>
					<button className="button button-primary" type="submit">
						Request service <ArrowRight />
					</button>
					<output
						aria-live="polite"
						className={`form-wide form-status ${/could not|invalid|error/i.test(state) ? "is-error" : ""}`}
					>
						{state}
					</output>
				</form>
			</section>
			<section className="section section-contrast">
				<div className="page-width faq-section">
					<div>
						<p className="eyebrow">Service FAQ</p>
						<h2>Before you book.</h2>
					</div>
					<div>
						{[
							[
								"How long does service take?",
								"Timing depends on the inspection, required parts, and current workshop load. We confirm an estimate before accepting the booking.",
							],
							[
								"Do you service e-mountain bikes?",
								"We assess e-MTB requests by brand, drive system, task, and available diagnostic support. Contact us with the exact model first.",
							],
							[
								"Are parts included?",
								"Replacement parts are quoted separately unless the confirmed service scope explicitly includes them.",
							],
							[
								"Can I request a specific technician?",
								"You may note a preference, but assignment depends on the work required and workshop availability.",
							],
						].map(([q, a]) => (
							<details key={q}>
								<summary>{q}</summary>
								<p>{a}</p>
							</details>
						))}
					</div>
				</div>
			</section>
		</PageFrame>
	);
}

export function AboutPage() {
	const [contactStatus, setContactStatus] = useState("");
	async function submitContact(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setContactStatus("Sending…");
		try {
			const form = new FormData(event.currentTarget);
			await submitContactMessage({ data: Object.fromEntries(form.entries()) });
			setContactStatus(
				"Thanks — your message has been sent to the Ridge & Ride team.",
			);
			event.currentTarget.reset();
		} catch (error) {
			setContactStatus(
				error instanceof Error
					? error.message
					: "We could not send your message.",
			);
		}
	}
	return (
		<PageFrame
			eyebrow="About Ridge & Ride"
			image="/images/about-forest-riders-hero.png"
			imageAlt="Two mountain bikers riding together through a pine forest"
			summary="More than a retail experience. Ridge & Ride brings mountain-bike selection, setup guidance, and workshop support together in one rider-focused place."
			title="A local shop for bigger days."
		>
			<section className="section page-width about-story">
				<div className="about-story-copy">
					<p className="eyebrow">Our story</p>
					<h2>Built around the way mountain bikers actually choose.</h2>
					<p>
						Mountain bikes are systems. Terrain, geometry, suspension,
						components, and rider preference all shape the result, so useful
						advice begins with the rider rather than a trend.
					</p>
					<p>
						Ridge & Ride is presented as a concept store. Business history, team
						details, certifications, and operating claims will be added only
						when verified.
					</p>
					<div className="about-stats">
						<span>
							<strong>1:1</strong>Decision support
						</span>
						<span>
							<strong>3</strong>Core ride categories
						</span>
					</div>
				</div>
				<figure>
					<img
						alt="Mountain bike mechanics collaborating at a professional workbench"
						loading="lazy"
						src="/images/about-workshop-hero.png"
					/>
					<figcaption>
						Knowledge that connects the shop floor to the trail.
					</figcaption>
				</figure>
			</section>
			<section className="about-community-photo">
				<img
					alt="Mountain bikers gathering together at a forest trailhead"
					loading="lazy"
					src="/images/catalog-apparel-hero.png"
				/>
				<div className="page-width">
					<p className="eyebrow">Our community</p>
					<h2>The people behind every ride.</h2>
				</div>
			</section>
			<section className="section section-contrast">
				<div className="page-width values-grid">
					<article>
						<span />
						<h2>Expert tuning</h2>
						<p>
							Detailed workshop conversations connect symptoms, setup,
							maintenance, and the exact bike before work begins.
						</p>
					</article>
					<article>
						<span />
						<h2>Rider-centric</h2>
						<p>
							We explain geometry, suspension, components, and fit in the
							context of your terrain and preferred handling.
						</p>
					</article>
					<article>
						<span />
						<h2>Community-minded</h2>
						<p>
							Useful guidance, accessible service contact, and ongoing setup
							support matter beyond the original purchase.
						</p>
					</article>
				</div>
			</section>
			<section className="section page-width about-contact" id="contact">
				<div className="about-contact-heading">
					<h2>Come say hello.</h2>
					<span>
						<small>Service contact</small>+1 (541) 555-0148
					</span>
				</div>
				<div className="about-contact-grid">
					<aside>
						<p className="eyebrow">The store</p>
						<strong>
							1847 Ridge Line Avenue
							<br />
							Bend, OR 97702
						</strong>
						<p>Demonstration location - verify before launch</p>
						<p className="eyebrow">Contact info</p>
						<a href="tel:+15415550148">+1 (541) 555-0148</a>
						<a href="mailto:hello@ridgeandride.example">
							hello@ridgeandride.example
						</a>
					</aside>
					<form onSubmit={submitContact}>
						<label>
							Full name
							<input autoComplete="name" name="name" required />
						</label>
						<label>
							Email address
							<input autoComplete="email" name="email" required type="email" />
						</label>
						<label>
							Phone number
							<input autoComplete="tel" name="phone" type="tel" />
						</label>
						<label>
							Inquiry topic
							<select name="topic">
								<option>General inquiry</option>
								<option>Bike advice</option>
								<option>Workshop service</option>
							</select>
						</label>
						<label className="form-wide">
							Your message
							<textarea name="message" required rows={5} />
						</label>
						<button className="button button-primary form-wide" type="submit">
							Send message <ArrowRight />
						</button>
						<output
							aria-live="polite"
							className={`form-wide form-status ${/could not|invalid|error/i.test(contactStatus) ? "is-error" : ""}`}
						>
							{contactStatus}
						</output>
					</form>
				</div>
			</section>
			<section className="section section-contrast">
				<div className="page-width visit-grid">
					<div>
						<p className="eyebrow">Visit the shop</p>
						<h2>Come say hello.</h2>
						<p>
							The address and contact details on this demonstration are
							placeholders and must be verified before public launch.
						</p>
					</div>
					<div
						className="visit-map"
						role="img"
						aria-label="Stylized placeholder map for the Ridge and Ride shop"
					>
						<MapPin />
						<span>Bend, Oregon</span>
					</div>
				</div>
			</section>
		</PageFrame>
	);
}

export function CartPage() {
	const [lines, setLines] = useState<CartLine[]>([]);
	useEffect(() => {
		const sync = () => setLines(readCart());
		sync();
		window.addEventListener("ridge-cart-updated", sync);
		return () => window.removeEventListener("ridge-cart-updated", sync);
	}, []);
	const subtotal = cartTotalCents(lines);
	return (
		<PageFrame
			eyebrow="Your cart"
			noIndex
			summary="Review the selected bike, adjust quantity, and confirm the current product details before moving to checkout."
			title="Ready for the next step."
		>
			<section className="section section-contrast">
				<div className="page-width cart-layout">
					<div className="cart-lines">
						{lines.length ? (
							lines.map((line) => (
								<article key={line.id}>
									<img alt={line.imageAlt} src={line.image} />
									<div>
										<p className="eyebrow">
											{line.color} / Size {line.size}
										</p>
										<h2>{line.name}</h2>
										<p>Price and stock are checked again before payment.</p>
										<div className="quantity">
											<button
												aria-label="Decrease quantity"
												onClick={() => {
													updateCartQuantity(line.id, line.quantity - 1);
													setLines(readCart());
												}}
												type="button"
											>
												<Minus />
											</button>
											<span>{line.quantity}</span>
											<button
												aria-label="Increase quantity"
												onClick={() => {
													updateCartQuantity(line.id, line.quantity + 1);
													setLines(readCart());
												}}
												type="button"
											>
												<Plus />
											</button>
										</div>
										<button
											type="button"
											onClick={() => {
												removeFromCart(line.id);
												setLines(readCart());
											}}
										>
											Remove
										</button>
									</div>
									<strong>
										{currency((line.unitPriceCents * line.quantity) / 100)}
									</strong>
								</article>
							))
						) : (
							<p>Your cart is empty.</p>
						)}
					</div>
					<aside className="order-summary">
						<p className="eyebrow">Order summary</p>
						<h2>{currency(subtotal / 100)}</h2>
						<p>
							Delivery and tax are calculated after the delivery address is
							confirmed.
						</p>
						<dl>
							<div>
								<dt>Subtotal</dt>
								<dd>{currency(subtotal / 100)}</dd>
							</div>
							<div>
								<dt>Estimated delivery</dt>
								<dd>Calculated next</dd>
							</div>
						</dl>
						<Link
							className={`button button-primary${lines.length ? "" : " disabled"}`}
							to="/checkout"
						>
							Continue to checkout <ArrowRight />
						</Link>
						<Link search={{ page: 1 }} to="/mountain-bikes">
							Continue shopping
						</Link>
					</aside>
				</div>
			</section>
		</PageFrame>
	);
}

export function CheckoutPage() {
	const [message, setMessage] = useState("");
	const [processing, setProcessing] = useState(false);
	const [discount, setDiscount] = useState("");
	const [lines, setLines] = useState<CartLine[]>([]);
	useEffect(() => setLines(readCart()), []);
	const subtotal = cartTotalCents(lines);
	async function submitCheckout(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!lines.length) {
			setMessage("Your cart is empty. Add an item before checkout.");
			return;
		}
		setProcessing(true);
		setMessage("");
		try {
			const values = Object.fromEntries(
				new FormData(event.currentTarget).entries(),
			);
			const order = await createRazorpayOrder({
				data: {
					email: String(values.email),
					lines: lines.map((line) => ({
						variantId: line.variantId,
						quantity: line.quantity,
					})),
					address: {
						fullName: `${values.firstName} ${values.lastName}`.trim(),
						line1: String(values.line1),
						line2: String(values.line2 || ""),
						city: String(values.city),
						region: String(values.region),
						postalCode: String(values.postalCode),
						countryCode: String(values.countryCode || "US"),
						phone: String(values.phone || ""),
					},
				},
			});
			await loadRazorpay();
			if (!window.Razorpay)
				throw new Error("Payment checkout could not load. Please try again.");
			const payment = new window.Razorpay({
				key: order.keyId,
				amount: order.amount,
				currency: order.currency,
				name: "Ridge & Ride",
				description: `Order ${order.orderNumber}`,
				order_id: order.orderId,
				handler: async (response) => {
					await verifyRazorpayPayment({
						data: {
							orderNumber: order.orderNumber,
							razorpayOrderId: response.razorpay_order_id,
							razorpayPaymentId: response.razorpay_payment_id,
							razorpaySignature: response.razorpay_signature,
						},
					});
					setMessage(
						`Payment complete. Order ${order.orderNumber} is confirmed.`,
					);
					setLines([]);
				},
				prefill: {
					email: String(values.email),
					name: `${values.firstName} ${values.lastName}`.trim(),
					contact: String(values.phone || ""),
				},
				theme: { color: "#7bcdb2" },
			});
			payment.on("payment.failed", () => {
				void recordPaymentFailure({ data: { orderNumber: order.orderNumber } });
				setMessage("Payment failed. Your cart is unchanged—please try again.");
			});
			payment.open();
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: "Checkout could not be started.",
			);
		} finally {
			setProcessing(false);
		}
	}
	return (
		<PageFrame
			eyebrow="Checkout"
			hideHero
			noIndex
			summary="Enter delivery information and pay securely through Razorpay. Your order is confirmed only after payment verification."
			title="Delivery details."
		>
			<section className="section section-contrast checkout-page">
				<nav
					className="page-width checkout-progress"
					aria-label="Checkout progress"
				>
					<span>Cart</span>
					<ChevronRight />
					<strong>Information</strong>
					<ChevronRight />
					<span>Shipping</span>
					<ChevronRight />
					<span>Payment</span>
				</nav>
				<div className="page-width checkout-layout">
					<form onSubmit={submitCheckout}>
						<div className="checkout-section-heading">
							<h2>Contact</h2>
							<span>
								Already have an account?{" "}
								<Link search={{ admin: false }} to="/account">
									Sign in
								</Link>
							</span>
						</div>
						<label className="form-wide">
							Email
							<input autoComplete="email" name="email" required type="email" />
						</label>
						<label className="checkout-consent form-wide">
							<input type="checkbox" /> Email me with news and offers
						</label>
						<h2>Delivery</h2>
						<div className="checkout-fields">
							<label>
								First name
								<input autoComplete="given-name" name="firstName" required />
							</label>
							<label>
								Last name
								<input autoComplete="family-name" name="lastName" required />
							</label>
							<label className="form-wide">
								Address
								<input autoComplete="street-address" name="line1" required />
							</label>
							<label className="form-wide">
								Apartment, suite, etc. (optional)
								<input autoComplete="address-line2" name="line2" />
							</label>
							<label>
								City
								<input autoComplete="address-level2" name="city" required />
							</label>
							<label>
								State
								<input autoComplete="address-level1" name="region" required />
							</label>
							<label>
								ZIP code
								<input
									autoComplete="postal-code"
									inputMode="numeric"
									name="postalCode"
									required
								/>
							</label>
							<label>
								Phone
								<input autoComplete="tel" name="phone" type="tel" />
							</label>
							<input name="countryCode" type="hidden" value="US" />
						</div>
						<h2>Shipping method</h2>
						<label className="shipping-option form-wide">
							<input defaultChecked name="shipping" type="radio" />
							<span>
								<strong>Standard shipping</strong>Timing confirmed from delivery
								address
							</span>
							<b>Calculated</b>
						</label>
						<h2>Payment</h2>
						<div className="payment-placeholder form-wide">
							<ShieldCheck />
							<div>
								<strong>Secure payment with Razorpay</strong>
								<p>
									Payment details are collected by Razorpay and never stored by
									Ridge &amp; Ride.
								</p>
							</div>
						</div>
						<div className="checkout-submit form-wide">
							<Link to="/cart">Return to cart</Link>
							<button
								className="button button-primary"
								disabled={processing}
								type="submit"
							>
								{processing ? "Preparing payment…" : "Pay securely"}{" "}
								<ArrowRight />
							</button>
						</div>
						<output
							aria-live="polite"
							className={`form-status ${/failed|exceeds|could not|invalid|empty|available|error/i.test(message) ? "is-error" : ""}`}
						>
							{message}
						</output>
					</form>
					<aside className="order-summary checkout-summary">
						{lines.map((line) => (
							<article key={line.id}>
								<div>
									<img alt={line.imageAlt} src={line.image} />
									<span>{line.quantity}</span>
								</div>
								<p>
									<strong>{line.name}</strong>
									<small>
										Size {line.size} / {line.color}
									</small>
								</p>
								<b>{currency((line.unitPriceCents * line.quantity) / 100)}</b>
							</article>
						))}
						<div className="discount-form">
							<label htmlFor="discount">Discount code</label>
							<div>
								<input id="discount" />
								<button
									onClick={() =>
										setDiscount(
											"Discount codes will be enabled with the order API.",
										)
									}
									type="button"
								>
									Apply
								</button>
							</div>
							<output aria-live="polite">{discount}</output>
						</div>
						<dl>
							<div>
								<dt>Subtotal</dt>
								<dd>{currency(subtotal / 100)}</dd>
							</div>
							<div>
								<dt>Shipping</dt>
								<dd>Calculated</dd>
							</div>
							<div>
								<dt>Estimated taxes</dt>
								<dd>Calculated</dd>
							</div>
						</dl>
						<div className="checkout-total">
							<span>
								Total<small>USD</small>
							</span>
							<strong>{currency(subtotal / 100)}</strong>
						</div>
						<div className="checkout-security">
							<ShieldCheck />
							<div>
								<strong>Checkout protection</strong>
								<p>
									Payment is verified on the server before the order is marked
									paid.
								</p>
							</div>
						</div>
						<Link to="/policies">Delivery, return, and privacy policies</Link>
					</aside>
				</div>
			</section>
		</PageFrame>
	);
}

export function UtilityPage({
	mode,
}: {
	mode: "search" | "account" | "wishlist" | "policies";
}) {
	const [query, setQuery] = useState("");
	const matches = query.trim()
		? bikes.filter((p) =>
				`${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()),
			)
		: [];
	const data = {
		search: [
			"Search the shop",
			"Find bikes, equipment, and practical guidance.",
		],
		account: [
			"Your account",
			"Sign in securely to manage profile details, orders, addresses, and saved bikes.",
		],
		wishlist: [
			"Saved bikes",
			"Keep a shortlist of bikes and equipment before making a final decision.",
		],
		policies: [
			"Shop policies",
			"Read the demonstration delivery, returns, privacy, accessibility, and size-guidance notices.",
		],
	}[mode];
	return (
		<PageFrame
			eyebrow="Ridge & Ride"
			noIndex={mode !== "policies"}
			summary={data[1]}
			title={data[0]}
		>
			<section className="section section-contrast">
				<div className="page-width utility-content">
					{mode === "search" ? (
						<>
							<form
								className="search-form"
								onSubmit={(e) => e.preventDefault()}
							>
								<label htmlFor="site-search">Search</label>
								<div>
									<input
										id="site-search"
										maxLength={80}
										onChange={(e) => setQuery(e.target.value)}
										placeholder="Try ‘enduro’ or ‘trail’"
										type="search"
										value={query}
									/>
									<button className="button button-primary" type="submit">
										Search
									</button>
								</div>
							</form>
							<p aria-live="polite">
								{query
									? `${matches.length} results for “${query}”`
									: "Enter a product or riding style."}
							</p>
							<div className="utility-results">
								{matches.map((p) => (
									<StoreProductCard key={p.id} product={p} />
								))}
							</div>
						</>
					) : mode === "account" ? (
						<div className="account-panel">
							<LogIn />
							<h2>Secure account access</h2>
							<p>
								Sign in to manage your profile, addresses, orders, and saved
								bikes. Your account is secured by Clerk.
							</p>
							<div className="account-auth-actions">
								<AuthActions
									className="button button-primary"
									showUserWhenSignedIn
								/>
							</div>
						</div>
					) : mode === "wishlist" ? (
						<div className="account-panel">
							<Heart />
							<h2>Your list is empty</h2>
							<p>
								Save a bike from its product page, then return here to compare
								your shortlist.
							</p>
							<Link
								className="button button-primary"
								search={{ page: 1 }}
								to="/mountain-bikes"
							>
								Browse bikes <ArrowRight />
							</Link>
						</div>
					) : (
						<div className="policy-grid">
							{[
								[
									"Delivery",
									"Delivery costs and timing are confirmed using the destination and available carrier before payment.",
								],
								[
									"Returns",
									"Unused products require an approved return process. Final conditions must be verified before launch.",
								],
								[
									"Privacy",
									"Only information needed to provide the requested service should be collected and retained.",
								],
								[
									"Accessibility",
									"Contact support if any part of this demonstration prevents access to information or controls.",
								],
								[
									"Size guidance",
									"Bike and apparel sizing varies by model. Compare published measurements and request help when uncertain.",
								],
							].map(([h, p]) => (
								<article key={h}>
									<h2>{h}</h2>
									<p>{p}</p>
								</article>
							))}
						</div>
					)}
				</div>
			</section>
		</PageFrame>
	);
}
