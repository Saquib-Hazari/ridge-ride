import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "../components/store-pages";
import { pageHead } from "../lib/page-head";
export const Route = createFileRoute("/service")({
	component: ServicePage,
	head: () =>
		pageHead(
			"Mountain Bike Service",
			"Request mountain bike inspections, suspension support, fitting, and workshop service.",
		),
});
