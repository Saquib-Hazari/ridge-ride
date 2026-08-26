import { createFileRoute } from "@tanstack/react-router";
import { UtilityPage } from "../components/store-pages";
export const Route = createFileRoute("/wishlist")({
	component: () => <UtilityPage mode="wishlist" />,
});
