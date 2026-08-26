import { ClerkProvider } from "@clerk/tanstack-react-start";

const ridgeRideAppearance = {
	variables: {
		colorPrimary: "#7bcdb2",
		colorBackground: "#111111",
		colorForeground: "#f7f7f4",
		colorInputBackground: "#050505",
		colorInputText: "#f7f7f4",
		colorText: "#f7f7f4",
		colorTextSecondary: "#b2b2b2",
		colorModalBackdrop: "rgba(5, 5, 5, 0.82)",
		fontFamily: "Inter, Arial, sans-serif",
		fontFamilyButtons: "Manrope, Arial, sans-serif",
		borderRadius: "12px",
	},
	elements: {
		card: "ridge-clerk-card",
		headerTitle: "ridge-clerk-title",
		headerSubtitle: "ridge-clerk-subtitle",
		formFieldLabel: "ridge-clerk-label",
		formFieldInput: "ridge-clerk-input",
		formButtonPrimary: "ridge-clerk-primary-button",
		socialButtonsBlockButton: "ridge-clerk-secondary-button",
		footerActionLink: "ridge-clerk-link",
		formFieldAction: "ridge-clerk-link",
	},
} as const;

export default function AppClerkProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ClerkProvider afterSignOutUrl="/" appearance={ridgeRideAppearance}>
			{children}
		</ClerkProvider>
	);
}
