import { createFileRoute } from "@tanstack/react-router";
import { UtilityPage } from "../components/store-pages";
export const Route = createFileRoute("/policies")({
	component: () => <UtilityPage mode="policies" />,
});
