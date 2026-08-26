import { createFileRoute, redirect } from "@tanstack/react-router";
import { CustomerDashboard } from "../components/dashboard-pages";
import {
	getAuthDestination,
	loadCustomerDashboard,
} from "../features/dashboard/dashboard-server";
export const Route = createFileRoute("/account")({
	validateSearch: (search: Record<string, unknown>) => ({
		admin: search.admin === true || search.admin === "true",
	}),
	beforeLoad: async ({ search }) => {
		if (!search.admin && (await getAuthDestination()) === "/admin") {
			throw redirect({ to: "/admin" });
		}
	},
	loader: () => loadCustomerDashboard(),
	component: () => <CustomerDashboard data={Route.useLoaderData()} />,
});
