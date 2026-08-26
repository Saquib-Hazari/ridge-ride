import {
	Show,
	SignOutButton,
	useClerk,
	useUser,
} from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { ChevronDown, LogIn, LogOut, Settings, UserPlus } from "lucide-react";

type AuthActionsProps = {
	className?: string;
	mode?: "sign-in" | "sign-up" | "both";
	onAction?: () => void;
	showUserWhenSignedIn?: boolean;
};

/**
 * Keeps Clerk's authentication flows behind the same visual controls used by
 * the shared header and account page.
 */
export function AuthActions({
	className,
	mode = "both",
	onAction,
	showUserWhenSignedIn = false,
}: AuthActionsProps) {
	return (
		<>
			<Show when="signed-out">
				{mode !== "sign-up" ? (
					<Link className={className} onClick={onAction} to="/sign-in">
						<LogIn aria-hidden="true" strokeWidth={1.8} />
						Sign in
					</Link>
				) : null}
				{mode !== "sign-in" ? (
					<Link className={className} onClick={onAction} to="/sign-up">
						<UserPlus aria-hidden="true" strokeWidth={1.8} />
						Sign up
					</Link>
				) : null}
			</Show>
			{showUserWhenSignedIn ? (
				<Show when="signed-in">
					<div className="clerk-user-control">
						<SignedInUserActions />
					</div>
				</Show>
			) : null}
		</>
	);
}

function SignedInUserActions() {
	const clerk = useClerk();
	const { user } = useUser();
	const displayName =
		user?.fullName ||
		user?.firstName ||
		user?.primaryEmailAddress?.emailAddress ||
		"My account";
	const firstName = user?.firstName || displayName.split(" ")[0];
	const email = user?.primaryEmailAddress?.emailAddress;

	return (
		<div className="auth-user-actions">
			<details className="account-menu">
				<summary aria-label={`Open account menu for ${displayName}`}>
					<Avatar imageUrl={user?.imageUrl} name={displayName} />
					<span className="auth-user-name">{firstName}</span>
					<ChevronDown aria-hidden="true" className="account-menu-chevron" />
				</summary>
				<div className="account-menu-popover">
					<div className="account-menu-identity">
						<Avatar imageUrl={user?.imageUrl} name={displayName} />
						<div>
							<strong>{displayName}</strong>
							{email ? <span>{email}</span> : null}
						</div>
					</div>
					<button
						className="account-menu-action"
						onClick={() => clerk.openUserProfile()}
						type="button"
					>
						<Settings aria-hidden="true" />
						Manage account
					</button>
					<SignOutButton redirectUrl="/">
						<button
							className="account-menu-action account-menu-signout"
							type="button"
						>
							<LogOut aria-hidden="true" />
							Sign out
						</button>
					</SignOutButton>
				</div>
			</details>
		</div>
	);
}

function Avatar({ imageUrl, name }: { imageUrl?: string; name: string }) {
	return imageUrl ? (
		<img alt="" className="auth-user-avatar" src={imageUrl} />
	) : (
		<span aria-hidden="true" className="auth-user-avatar auth-user-fallback">
			{name.slice(0, 1).toUpperCase()}
		</span>
	);
}
