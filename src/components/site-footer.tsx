import { Link } from "@tanstack/react-router";
import {
	Facebook,
	Instagram,
	Linkedin,
	Mail,
	MapPin,
	Phone,
	Twitter,
} from "lucide-react";

const groups = [
	{
		title: "Shop",
		links: [
			["Mountain bikes", "/mountain-bikes"],
			["Parts & gear", "/parts-gear"],
			["Apparel", "/apparel"],
			["Protection", "/parts-gear"],
		],
	},
	{
		title: "Services",
		links: [
			["Workshop services", "/service"],
			["Book a service", "/service"],
			["Bike fitting", "/service"],
		],
	},
	{
		title: "Ridge & Ride",
		links: [
			["About us", "/about"],
			["Contact", "/about"],
			["Policies", "/policies"],
		],
	},
] as const;

export function SiteFooter() {
	return (
		<footer className="site-footer">
			<div className="page-width footer-grid">
				<div className="footer-card footer-intro">
					<Link
						aria-label="Ridge & Ride home"
						className="brand-mark footer-logo"
						to="/"
					>
						<img alt="Ridge & Ride" src="/images/ridge-ride-logo-lockup.png" />
					</Link>
					<address>
						<span>
							<MapPin aria-hidden="true" />
							1847 Ridge Line Avenue, Bend, OR 97702
						</span>
						<span>
							<Phone aria-hidden="true" />
							+1 (541) 555-0148
						</span>
						<span>
							<Mail aria-hidden="true" />
							hello@ridgeandride.example
						</span>
					</address>
					<nav aria-label="Social media" className="social-links">
						{[
							["Instagram", Instagram],
							["Facebook", Facebook],
							["Twitter", Twitter],
							["LinkedIn", Linkedin],
						].map(([label, Icon]) => (
							<button
								aria-label={`${label} - coming soon`}
								key={String(label)}
								type="button"
							>
								<Icon aria-hidden="true" />
							</button>
						))}
					</nav>
				</div>
				{groups.map((group) => (
					<div className="footer-card footer-link-card" key={group.title}>
						<h2>{group.title}</h2>
						<ul>
							{group.links.map(([label, to]) => (
								<li key={label}>
									<Link to={to}>{label}</Link>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
			<div className="page-width footer-base">
				<span>
					© {new Date().getFullYear()} Ridge & Ride. All rights reserved.
				</span>
				<span>Built for riders, not placeholders.</span>
			</div>
			<div aria-hidden="true" className="footer-rider">
				RIDER
			</div>
		</footer>
	);
}
