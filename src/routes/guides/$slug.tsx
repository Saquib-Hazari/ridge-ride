import { createFileRoute, notFound } from "@tanstack/react-router";
import { BlogPage } from "../../components/blog-pages";
import { pageHead } from "../../lib/page-head";

const slugs = ["trail", "enduro", "downhill"] as const;
export const Route = createFileRoute("/guides/$slug")({
	loader: ({ params }) => {
		if (!slugs.includes(params.slug as (typeof slugs)[number]))
			throw notFound();
		return params.slug as (typeof slugs)[number];
	},
	component: () => <BlogPage slug={Route.useLoaderData()} />,
	head: ({ loaderData }) =>
		pageHead(
			loaderData
				? `${loaderData.charAt(0).toUpperCase()}${loaderData.slice(1)} bike guide`
				: "Mountain bike guide",
			loaderData
				? `A practical Ridge & Ride guide to choosing a ${loaderData} mountain bike.`
				: "Practical mountain bike buying guides from Ridge & Ride.",
		),
});
