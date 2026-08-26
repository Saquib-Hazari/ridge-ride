import { createFileRoute } from "@tanstack/react-router";
import { UtilityPage } from "../components/store-pages";
export const Route = createFileRoute("/search")({
	component: () => <UtilityPage mode="search" />,
});
