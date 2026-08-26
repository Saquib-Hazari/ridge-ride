import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronRight, Star } from "lucide-react";
import { PageFrame } from "./store-pages";

const guides = {
	trail: {
		eyebrow: "Buying guide / Trail",
		title: "Trail bikes for long climbs and loose, fast descents.",
		summary:
			"A practical guide to choosing a versatile trail bike when your rides mix technical climbs, natural singletrack, and all-day distance.",
		image: "/images/guide-trail-vs-enduro.png",
		travel: "130–150 mm",
		pick: "The balanced choice",
		review:
			"Trail bikes reward riders who want one dependable setup for most of the week. Look for a supportive climbing position, predictable suspension, and tyres that suit your local rock and roots.",
		faq: [
			[
				"Is a trail bike good for beginners?",
				"Yes. A modern trail bike is forgiving enough to build confidence while leaving room to grow into steeper and more technical terrain.",
			],
			[
				"How much travel do I need?",
				"Around 130–150 mm covers a wide range of trail riding. Choose more travel when rough descents consistently outweigh long climbs.",
			],
			[
				"Should I choose 29-inch wheels?",
				"29-inch wheels roll efficiently over roots and holes. Smaller riders may prefer a mixed-wheel option if manoeuvrability is the priority.",
			],
		],
	},
	enduro: {
		eyebrow: "Buying guide / Enduro",
		title: "Enduro bikes for steep lines and big mountain days.",
		summary:
			"Understand the extra travel, geometry, and component strength that make an enduro bike feel calm when the trail gets rough and fast.",
		image: "/images/hero-enduro-product-v2.png",
		travel: "160–180 mm",
		pick: "The rough-terrain pick",
		review:
			"Enduro bikes make sense when descending confidence is the priority. The trade-off is extra weight and a less lively feel on flatter, smoother trails.",
		faq: [
			[
				"Are enduro bikes hard to pedal?",
				"They climb capably, but their longer travel and heavier components are designed around descending control rather than maximum efficiency.",
			],
			[
				"Who should buy an enduro bike?",
				"Riders who regularly ride steep, technical terrain, race enduro, or spend weekends in high-alpine terrain will benefit most.",
			],
			[
				"Can an enduro bike replace a trail bike?",
				"For many riders, yes. If your local rides are mostly smooth or low-gradient, a trail bike will usually feel more rewarding.",
			],
		],
	},
	downhill: {
		eyebrow: "Buying guide / Downhill",
		title: "Downhill bikes for lift laps and committed speed.",
		summary:
			"A focused guide to dual-crown forks, long travel, and gravity components for riders who want a purpose-built bike-park machine.",
		image: "/images/mtb-downhill-studio.png",
		travel: "190–210 mm",
		pick: "The gravity specialist",
		review:
			"A downhill bike is a specialist tool: stable at speed, confident through compressions, and ready for repeated hard laps. It is not intended to replace a climbing bike.",
		faq: [
			[
				"Can I ride a downhill bike on trails?",
				"You can ride it downhill, but without a lift or shuttle it is inefficient to get back to the top and awkward on rolling trails.",
			],
			[
				"What makes downhill bikes different?",
				"They use long travel, slack geometry, dual-crown forks, powerful brakes, and durable wheels to handle repeated high-speed impacts.",
			],
			[
				"Do I need a downhill bike for a bike park?",
				"Not always. A long-travel enduro bike is more versatile, while a downhill bike is the better choice for dedicated gravity laps.",
			],
		],
	},
} as const;

export function BlogPage({ slug }: { slug: keyof typeof guides }) {
	const guide = guides[slug];
	return (
		<PageFrame
			eyebrow={guide.eyebrow}
			title={guide.title}
			summary={guide.summary}
			image={guide.image}
			imageAlt={`${slug} mountain bike guide`}
		>
			<article className="guide-article">
				<div className="page-width guide-article-grid">
					<div className="guide-article-main">
						<p className="eyebrow">The short answer</p>
						<h2>{guide.pick}</h2>
						<p>{guide.review}</p>
						<div className="guide-facts">
							<div>
								<span>Typical travel</span>
								<strong>{guide.travel}</strong>
							</div>
							<div>
								<span>Best for</span>
								<strong>
									{slug === "trail"
										? "Mixed terrain"
										: slug === "enduro"
											? "Steep descents"
											: "Bike parks"}
								</strong>
							</div>
							<div>
								<span>Priority</span>
								<strong>
									{slug === "trail"
										? "Balance"
										: slug === "enduro"
											? "Control"
											: "Speed"}
								</strong>
							</div>
						</div>
						<h2>What to look for</h2>
						<ul className="guide-checklist">
							<li>
								<Check />A frame and suspension tune matched to your terrain.
							</li>
							<li>
								<Check />
								Tyres and brakes that support your speed and surface.
							</li>
							<li>
								<Check />A fit you can ride comfortably for the length of your
								usual day.
							</li>
						</ul>
						<div className="guide-review">
							<div className="guide-stars">
								{[1, 2, 3, 4, 5].map((star) => (
									<Star fill="currentColor" key={star} />
								))}
							</div>
							<strong>Rider perspective</strong>
							<p>
								{guide.review} Start with the terrain you ride most, then
								compare the specification rather than chasing the biggest
								number.
							</p>
						</div>
						<h2>Frequently asked questions</h2>
						<div className="guide-faq">
							{guide.faq.map(([question, answer]) => (
								<details key={question}>
									<summary>
										{question}
										<ChevronRight />
									</summary>
									<p>{answer}</p>
								</details>
							))}
						</div>
					</div>
					<aside className="guide-article-aside">
						<p className="eyebrow">Keep exploring</p>
						<h3>Compare the full bike range.</h3>
						<p>
							Use the catalogue to compare current models, fit details, and
							available variants.
						</p>
						<Link
							className="button button-primary"
							search={{ page: 1 }}
							to="/mountain-bikes"
						>
							Shop bikes <ArrowRight />
						</Link>
					</aside>
				</div>
			</article>
		</PageFrame>
	);
}
