export function pageHead(
	title: string,
	description: string,
	noIndex = false,
	path = "/",
) {
	const siteUrl = (
		import.meta.env.PUBLIC_SITE_URL || "http://localhost:3000"
	).replace(/\/$/, "");
	return {
		meta: [
			{ title: `${title} | Ridge & Ride` },
			{ name: "description", content: description },
			{ property: "og:title", content: `${title} | Ridge & Ride` },
			{ property: "og:description", content: description },
			{ property: "og:type", content: "website" },
			...(noIndex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
		],
		links: [{ rel: "canonical", href: `${siteUrl}${path}` }],
	};
}
