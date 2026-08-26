import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "../components/store-pages";
import { pageHead } from "../lib/page-head";
export const Route = createFileRoute("/parts-gear")({
	component: () => <CatalogPage kind="gear" title="Parts and gear." />,
	head: () =>
		pageHead(
			"Mountain Bike Parts & Gear",
			"Shop mountain bike components, protection, tools, and ride essentials with compatibility guidance.",
		),
});
