import { createFileRoute, notFound } from "@tanstack/react-router";
import { ProductPage } from "../../../components/store-pages";
import { loadProduct } from "../../../features/catalog/catalog-server";
export const Route = createFileRoute("/mountain-bikes/$category/$slug")({
	loader: async ({ params }) => {
		const product = await loadProduct({ data: { slug: params.slug } });
		if (!product || product.category !== params.category) throw notFound();
		return product;
	},
	component: () => <ProductPage product={Route.useLoaderData()} />,
});
