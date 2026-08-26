import {
	createRootRoute,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";

import ClerkProvider from "../integrations/clerk/provider";

import PostHogProvider from "../integrations/posthog/provider";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Ridge & Ride | Mountain Bikes & Workshop Support",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "BikeStore",
					name: "Ridge & Ride",
					url: import.meta.env.PUBLIC_SITE_URL || "http://localhost:3000",
					description: "Mountain bikes, riding gear, and workshop support.",
				}),
			},
		],
	}),
	shellComponent: RootDocument,
	errorComponent: RootError,
	notFoundComponent: RootNotFound,
});

function RootError({ reset }: { reset: () => void }) {
	return (
		<main className="page-width error-page">
			<p className="eyebrow">Something went wrong</p>
			<h1>That page could not load.</h1>
			<p>
				Try again, or return to the storefront. If the problem continues,
				contact support.
			</p>
			<div>
				<button className="button button-primary" onClick={reset} type="button">
					Try again
				</button>
				<Link className="button" to="/">
					Back to home
				</Link>
			</div>
		</main>
	);
}

function RootNotFound() {
	return (
		<main className="page-width error-page">
			<p className="eyebrow">404</p>
			<h1>We could not find that page.</h1>
			<p>The link may be outdated or the product may no longer be available.</p>
			<Link className="button button-primary" to="/">
				Back to home
			</Link>
		</main>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<ClerkProvider>
					<PostHogProvider>{children}</PostHogProvider>
				</ClerkProvider>
				<Scripts />
			</body>
		</html>
	);
}
