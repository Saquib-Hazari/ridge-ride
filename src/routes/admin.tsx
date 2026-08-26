import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "../components/dashboard-pages";
import { loadAdminDashboard } from "../features/dashboard/dashboard-server";

export const Route = createFileRoute("/admin")({
	loader: () => loadAdminDashboard(),
	component: () => <AdminDashboard data={Route.useLoaderData()} />,
});
