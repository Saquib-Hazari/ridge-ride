import { createFileRoute, Link } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { subscribeNewsletter } from "../features/forms/forms-server";
import { pageHead } from "../lib/page-head";

export const Route = createFileRoute("/")({
	component: Home,
	head: () =>
		pageHead(
			"Mountain Bikes, Gear & Workshop Support",
			"Shop capable mountain bikes, riding gear, and expert workshop support at Ridge & Ride.",
		),
});

const rideStyles = [
	{
		name: "Trail",
		description:
			"One bike for long climbs, fast descents, and every lap in between.",
		image:
			"https://www.wtb.com/cdn/shop/articles/LaThuile18__X2_1794.JPG?v=1532385137&width=2000",
	},
	{
		name: "Enduro",
		description: "More travel and confidence for steep, technical terrain.",
		image:
			"https://s3.amazonaws.com/images.gearjunkie.com/uploads/2022/06/EWS-5-1880x1254.jpeg",
	},
	{
		name: "Downhill",
		description: "Purpose-built speed for bike-park laps and committed lines.",
		image:
			"https://mondraker.com/storage/resources/page/39/gallery/65d88d5890f44076605031-23mondrakerfr-kabelleira-00137.jpg",
	},
];

const featuredBikes = [
	{
		brand: "Ridge & Ride",
		name: "Alpine Trail 29",
		slug: "hightower-c-x0",
		price: "From $3,899",
		image: "/images/mtb-trail-studio.png",
		imageAlt: "Full-suspension trail mountain bike in a dark studio",
	},
	{
		brand: "Ridge & Ride",
		name: "Northline Enduro",
		slug: "nomad-c-s",
		price: "From $4,799",
		image: "/images/mtb-enduro-studio.png",
		imageAlt: "Long-travel enduro mountain bike in a dark studio",
	},
	{
		brand: "Ridge & Ride",
		name: "Summit Park",
		slug: "v10-cc-x0",
		price: "From $5,249",
		image: "/images/mtb-downhill-studio.png",
		imageAlt: "Downhill mountain bike with a dual-crown fork in a dark studio",
	},
];

const guides = [
	{
		topic: "Fit guide",
		title: "How to choose your mountain bike size",
		summary:
			"Start with fit, then use reach, stack, and riding style to narrow your choice.",
		image: "/images/guide-mtb-fit.png",
		imageAlt: "Professional mountain-bike fitting session",
	},
	{
		topic: "Bike choice",
		title: "Trail bike or enduro bike?",
		summary:
			"A practical comparison of travel, terrain, climbing efficiency, and confidence.",
		image: "/images/guide-trail-vs-enduro.png",
		imageAlt: "Trail and enduro mountain bikes displayed side by side",
	},
	{
		topic: "Workshop notes",
		title: "When should you service your suspension?",
		summary:
			"A rider-friendly checklist for keeping your fork and shock working as intended.",
		image: "/images/guide-suspension-service.png",
		imageAlt: "Mechanic servicing a full-suspension mountain bike",
	},
];

function Home() {
	const pageRef = useRef<HTMLDivElement>(null);
	const [email, setEmail] = useState("");
	const [newsletterMessage, setNewsletterMessage] = useState("");
	const debugLayout =
		import.meta.env.DEV && import.meta.env.VITE_DEBUG_LAYOUT === "true";

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		gsap.registerPlugin(ScrollTrigger);
		const context = gsap.context(() => {
			const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
			heroTimeline
				.from("[data-hero-heading]", { duration: 0.9, opacity: 0, y: 38 })
				.from(
					"[data-hero-bike]",
					{ duration: 1.05, opacity: 0, scale: 0.9, x: 70 },
					"-=0.62",
				)
				.from(
					"[data-hero-detail]",
					{ duration: 0.55, opacity: 0, stagger: 0.09, y: 16 },
					"-=0.48",
				);
			gsap.to("[data-hero-bike]", {
				duration: 4.8,
				ease: "sine.inOut",
				repeat: -1,
				y: -8,
				yoyo: true,
			});
			gsap.utils
				.toArray<HTMLElement>("[data-scroll-reveal]")
				.forEach((element) => {
					gsap.from(element, {
						duration: 0.7,
						ease: "power3.out",
						opacity: 0,
						scrollTrigger: { once: true, start: "top 86%", trigger: element },
						y: 32,
					});
				});
			gsap.utils.toArray<HTMLElement>("[data-card-stagger]").forEach((grid) => {
				gsap.from(grid.children, {
					duration: 0.62,
					ease: "power3.out",
					opacity: 0,
					stagger: 0.1,
					scrollTrigger: { once: true, start: "top 86%", trigger: grid },
					y: 28,
				});
			});
		}, pageRef);
		return () => context.revert();
	}, []);

	async function submitNewsletter(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!email.includes("@")) {
			setNewsletterMessage("Enter a valid email address to join the list.");
			return;
		}
		try {
			await subscribeNewsletter({ data: { email } });
			setNewsletterMessage("Thanks - you are on the Ridge & Ride list.");
			setEmail("");
		} catch (error) {
			setNewsletterMessage(
				error instanceof Error
					? error.message
					: "We could not subscribe you right now.",
			);
		}
	}

	return (
		<div
			className="site-shell"
			data-debug-layout={debugLayout || undefined}
			ref={pageRef}
		>
			{debugLayout ? (
				<output className="debug-layout-indicator">
					Layout diagnostics on
				</output>
			) : null}
			<a className="skip-link" href="#main-content">
				Skip to content
			</a>
			<SiteHeader />

			<main id="main-content">
				<section className="hero" aria-labelledby="hero-title">
					<div
						aria-hidden="true"
						className="hero-word hero-word-front"
						data-hero-heading
					>
						RID
					</div>
					<div
						aria-hidden="true"
						className="hero-word hero-word-back"
						data-hero-heading
					>
						GE
					</div>
					<img
						alt="Premium black and mint full-suspension enduro mountain bike"
						className="hero-bike"
						data-hero-bike
						src="/images/hero-enduro-cutout.png"
					/>
					<div className="hero-content page-width">
						<div className="hero-intro" data-hero-detail>
							<p className="eyebrow">Ridge & Ride / Enduro series</p>
							<h1 id="hero-title">Northline Enduro</h1>
							<p>Built to climb efficiently and descend without compromise.</p>
						</div>
						<div className="hero-note" data-hero-detail>
							<p>Long-travel control for steep, technical terrain.</p>
						</div>
						<div className="hero-specs" data-hero-detail>
							<span>29-inch wheels</span>
							<span>160 mm travel</span>
							<span>Carbon frame</span>
						</div>
						<div className="hero-actions" data-hero-detail>
							<Link
								className="button button-primary"
								search={{ page: 1 }}
								to="/mountain-bikes"
							>
								Explore the bike <ArrowRight aria-hidden="true" />
							</Link>
							<span className="hero-index">01 / 03</span>
						</div>
					</div>
				</section>

				<section
					data-scroll-reveal
					className="section page-width"
					id="ride-styles"
					aria-labelledby="ride-styles-title"
				>
					<div className="section-heading split-heading">
						<div>
							<p className="eyebrow">Shop by terrain</p>
							<h2 id="ride-styles-title">Built for the way you ride.</h2>
						</div>
						<p>
							From all-day trail rides to lift-accessed descents, start with the
							bike that matches your local terrain and ambitions.
						</p>
					</div>
					<div className="ride-grid" data-card-stagger>
						{rideStyles.map((ride) => (
							<Link
								className="ride-card"
								key={ride.name}
								params={{ slug: ride.name.toLowerCase() }}
								to="/guides/$slug"
							>
								<img alt="" src={ride.image} />
								<div>
									<p className="eyebrow">Mountain bikes</p>
									<h3>{ride.name}</h3>
									<p>{ride.description}</p>
									<span>
										Explore {ride.name.toLowerCase()} bikes{" "}
										<ArrowRight aria-hidden="true" />
									</span>
								</div>
							</Link>
						))}
					</div>
				</section>

				<section
					data-scroll-reveal
					className="section section-contrast"
					id="featured-bikes"
					aria-labelledby="featured-title"
				>
					<div className="page-width">
						<div className="section-heading row-heading">
							<div>
								<p className="eyebrow">Fresh in the workshop</p>
								<h2 id="featured-title">Featured rides</h2>
							</div>
							<Link className="text-link" to="/">
								View all bikes <ArrowRight aria-hidden="true" />
							</Link>
						</div>
						<div className="product-grid" data-card-stagger>
							{featuredBikes.map((bike) => (
								<article className="product-card" key={bike.name}>
									<Link
										params={{
											category:
												bike.name === "Alpine Trail 29"
													? "trail"
													: bike.name === "Northline Enduro"
														? "enduro"
														: "downhill",
											slug: bike.slug,
										}}
										to="/mountain-bikes/$category/$slug"
									>
										<div className="product-image">
											<img alt={bike.imageAlt} src={bike.image} />
											<span>In stock</span>
										</div>
										<p className="eyebrow">{bike.brand}</p>
										<h3>{bike.name}</h3>
										<p className="price">{bike.price}</p>
										<span className="product-link">
											View bike <ArrowRight aria-hidden="true" />
										</span>
									</Link>
								</article>
							))}
						</div>
					</div>
				</section>

				<section
					className="service-feature"
					data-scroll-reveal
					aria-labelledby="service-title"
				>
					<img
						alt="Mechanic servicing a full-suspension mountain bike in the workshop"
						src="/images/workshop-service-banner.png"
					/>
					<div className="service-overlay" />
					<div className="page-width service-content">
						<p className="eyebrow">Workshop support</p>
						<h2 id="service-title">Service built for big days.</h2>
						<p>
							From seasonal tune-ups to suspension service, our workshop helps
							keep every ride feeling right.
						</p>
						<Link className="button button-primary" to="/service">
							Explore services <ArrowRight aria-hidden="true" />
						</Link>
					</div>
				</section>

				<section
					className="section page-width"
					data-scroll-reveal
					aria-labelledby="guides-title"
				>
					<div className="section-heading row-heading">
						<div>
							<p className="eyebrow">From the journal</p>
							<h2 id="guides-title">Know your ride.</h2>
						</div>
						<Link
							className="text-link"
							to="/guides/$slug"
							params={{ slug: "trail" }}
						>
							Read all guides <ArrowRight aria-hidden="true" />
						</Link>
					</div>
					<div className="guide-grid" data-card-stagger>
						{guides.map((guide) => (
							<article className="guide-card" key={guide.title}>
								<a href="/guides/trail">
									<div className="guide-card-media">
										<img alt={guide.imageAlt} src={guide.image} />
									</div>
									<div className="guide-card-body">
										<p className="eyebrow">{guide.topic}</p>
										<h3>{guide.title}</h3>
										<p>{guide.summary}</p>
										<span>
											Read guide <ArrowRight aria-hidden="true" />
										</span>
									</div>
								</a>
							</article>
						))}
					</div>
				</section>

				<section
					data-scroll-reveal
					className="newsletter"
					id="newsletter"
					aria-labelledby="newsletter-title"
				>
					<div className="page-width newsletter-inner">
						<div>
							<h2 id="newsletter-title">Get the good stuff.</h2>
							<p>
								New drops, helpful guidance, and workshop news—occasionally.
							</p>
						</div>
						<form noValidate onSubmit={submitNewsletter}>
							<label htmlFor="newsletter-email">Your email address</label>
							<div>
								<input
									aria-describedby="newsletter-status"
									id="newsletter-email"
									onChange={(event) => setEmail(event.target.value)}
									placeholder="you@example.com"
									required
									type="email"
									value={email}
								/>
								<button type="submit">
									Join <ArrowRight aria-hidden="true" />
								</button>
							</div>
							<output aria-live="polite" id="newsletter-status">
								{newsletterMessage}
							</output>
						</form>
					</div>
				</section>
			</main>

			<SiteFooter />
		</div>
	);
}
