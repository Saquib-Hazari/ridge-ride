import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "../components/store-pages";
import { pageHead } from "../lib/page-head";
export const Route = createFileRoute("/about")({
	component: AboutPage,
	head: () =>
		pageHead(
			"About",
			"Meet the rider-focused approach behind Ridge & Ride mountain bikes and workshop support.",
		),
});
