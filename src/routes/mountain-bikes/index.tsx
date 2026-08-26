import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "../../components/store-pages";
import { loadCatalog } from "../../features/catalog/catalog-server";
import { pageHead } from "../../lib/page-head";
export const Route = createFileRoute("/mountain-bikes/")({
	validateSearch: (search: Record<string, unknown>) => ({
		page:
			typeof search.page === "number" ? search.page : Number(search.page) || 1,
	}),
	loaderDeps: ({ search }) => ({ page: search.page }),
	loader: ({ deps }) => loadCatalog({ data: { page: deps.page } }),
	component: () => {
		const data = Route.useLoaderData();
		return (
			<CatalogPage
				kind="bikes"
				pagination={data}
				products={data.items}
				title="Shop mountain bikes."
			/>
		);
	},
	head: () =>
		pageHead(
			"Mountain Bikes",
			"Compare trail, enduro, and downhill mountain bikes by terrain, travel, wheel format, and fit.",
		),
});
