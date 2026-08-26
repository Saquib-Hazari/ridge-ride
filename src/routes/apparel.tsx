import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "../components/store-pages";
import { pageHead } from "../lib/page-head";
export const Route = createFileRoute("/apparel")({
	component: () => <CatalogPage kind="apparel" title="Apparel for the ride." />,
	head: () =>
		pageHead(
			"Mountain Bike Apparel",
			"Shop technical mountain bike jerseys, pants, and gloves by fit and riding conditions.",
		),
});
