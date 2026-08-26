import { PostHogProvider as BasePostHogProvider } from "@posthog/react";
import posthog from "posthog-js";
import type { ReactNode } from "react";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogEnabled = Boolean(posthogKey && !posthogKey.includes("xxx"));

if (typeof window !== "undefined" && posthogEnabled) {
	posthog.init(posthogKey, {
		api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
		person_profiles: "identified_only",
		capture_pageview: false,
		defaults: "2025-11-30",
	});
}

interface PostHogProviderProps {
	children: ReactNode;
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
	return posthogEnabled ? (
		<BasePostHogProvider client={posthog}>{children}</BasePostHogProvider>
	) : (
		children
	);
}
