import { useClerk } from "@clerk/tanstack-react-start";
import { useSignIn, useSignUp } from "@clerk/tanstack-react-start/legacy";
import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { getAuthDestination } from "../features/dashboard/dashboard-server";

function AuthFrame({
	mode,
	children,
}: {
	mode: "sign-in" | "sign-up";
	children: React.ReactNode;
}) {
	return (
		<main className="custom-auth-page">
			<div className="custom-auth-brand">
				<Link to="/">Ridge &amp; Ride</Link>
				<span>Mountain bikes / Workshop support</span>
			</div>
			<div className="custom-auth-layout">
				<section className="custom-auth-intro">
					<p className="eyebrow">
						{mode === "sign-in" ? "Welcome back" : "Create your account"}
					</p>
					<h1>
						{mode === "sign-in"
							? "Keep your next ride moving."
							: "Make every ride easier to plan."}
					</h1>
					<p>
						{mode === "sign-in"
							? "Access your saved bikes, orders, delivery details, and workshop conversations."
							: "Save bikes, follow orders, and keep your fit and setup details close."}
					</p>
				</section>
				<section className="custom-auth-card">{children}</section>
			</div>
		</main>
	);
}

function GoogleButton({
	onClick,
	busy,
}: {
	onClick: () => void;
	busy: boolean;
}) {
	return (
		<button
			className="google-auth-button"
			disabled={busy}
			onClick={onClick}
			type="button"
		>
			<span className="google-mark">G</span>
			{busy ? "Opening Google…" : "Continue with Google"}
		</button>
	);
}

export function CustomSignIn() {
	const { isLoaded, signIn } = useSignIn();
	const clerk = useClerk();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	async function submit(event: FormEvent) {
		event.preventDefault();
		if (!isLoaded || !signIn) return;
		setBusy(true);
		setError("");
		try {
			const result = await signIn.create({
				identifier: email,
				password,
				strategy: "password",
			});
			if (result.createdSessionId) {
				await clerk.setActive({ session: result.createdSessionId });
				const destination = await getAuthDestination();
				await navigate({ to: destination });
			} else
				setError(
					"Additional verification is required. Please use Google sign-in or reset your password.",
				);
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "We could not sign you in.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function google() {
		if (!isLoaded || !signIn) return;
		setBusy(true);
		setError("");
		try {
			await signIn.authenticateWithRedirect({
				strategy: "oauth_google",
				redirectUrl: "/sign-in",
				redirectUrlComplete: "/account",
			});
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Google sign-in could not start.",
			);
			setBusy(false);
		}
	}
	return (
		<AuthFrame mode="sign-in">
			<p className="auth-card-kicker">Sign in</p>
			<h2>Welcome back.</h2>
			<GoogleButton busy={busy} onClick={google} />
			<div className="auth-divider">
				<span>or continue with email</span>
			</div>
			<form className="custom-auth-form" onSubmit={submit}>
				<label>
					Email address
					<input
						autoComplete="email"
						onChange={(event) => setEmail(event.target.value)}
						required
						type="email"
						value={email}
					/>
				</label>
				<label>
					Password<a href="#forgot">Forgot password?</a>
					<input
						autoComplete="current-password"
						onChange={(event) => setPassword(event.target.value)}
						required
						type="password"
						value={password}
					/>
				</label>
				{error ? (
					<p className="auth-form-error" role="alert">
						{error}
					</p>
				) : null}
				<button
					className="button button-primary auth-submit"
					disabled={busy || !isLoaded}
					type="submit"
				>
					{busy ? "Signing in…" : "Sign in"}
				</button>
			</form>
			<p className="auth-switch">
				New to Ridge &amp; Ride? <Link to="/sign-up">Create an account</Link>
			</p>
		</AuthFrame>
	);
}

export function CustomSignUp() {
	const { isLoaded, signUp } = useSignUp();
	const clerk = useClerk();
	const navigate = useNavigate();
	const [form, setForm] = useState({
		firstName: "",
		lastName: "",
		email: "",
		password: "",
	});
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	async function submit(event: FormEvent) {
		event.preventDefault();
		if (!isLoaded || !signUp) return;
		setBusy(true);
		setError("");
		try {
			const result = await signUp.create({ ...form, legalAccepted: true });
			if (result.createdSessionId) {
				await clerk.setActive({ session: result.createdSessionId });
				const destination = await getAuthDestination();
				await navigate({ to: destination });
			} else if (result.unverifiedFields?.includes("email_address")) {
				await signUp.prepareEmailAddressVerification({
					strategy: "email_code",
				});
				setError(
					"Check your email for a verification code, then complete verification in your account.",
				);
			} else setError("Your account needs one more verification step.");
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "We could not create your account.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function google() {
		if (!isLoaded || !signUp) return;
		setBusy(true);
		setError("");
		try {
			await signUp.authenticateWithRedirect({
				strategy: "oauth_google",
				redirectUrl: "/sign-up",
				redirectUrlComplete: "/account",
			});
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Google sign-up could not start.",
			);
			setBusy(false);
		}
	}
	const update =
		(key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
			setForm((current) => ({ ...current, [key]: event.target.value }));
	return (
		<AuthFrame mode="sign-up">
			<p className="auth-card-kicker">Join the shop</p>
			<h2>Create your account.</h2>
			<GoogleButton busy={busy} onClick={google} />
			<div className="auth-divider">
				<span>or use your email</span>
			</div>
			<form className="custom-auth-form" onSubmit={submit}>
				<div className="auth-name-fields">
					<label>
						First name
						<input
							autoComplete="given-name"
							onChange={update("firstName")}
							required
							value={form.firstName}
						/>
					</label>
					<label>
						Last name
						<input
							autoComplete="family-name"
							onChange={update("lastName")}
							required
							value={form.lastName}
						/>
					</label>
				</div>
				<label>
					Email address
					<input
						autoComplete="email"
						onChange={update("email")}
						required
						type="email"
						value={form.email}
					/>
				</label>
				<label>
					Password
					<input
						autoComplete="new-password"
						minLength={8}
						onChange={update("password")}
						required
						type="password"
						value={form.password}
					/>
				</label>
				{error ? (
					<p className="auth-form-error" role="alert">
						{error}
					</p>
				) : null}
				<button
					className="button button-primary auth-submit"
					disabled={busy || !isLoaded}
					type="submit"
				>
					{busy ? "Creating account…" : "Create account"}
				</button>
			</form>
			<p className="auth-terms">
				By continuing, you agree to the store terms and privacy policy.
			</p>
			<p className="auth-switch">
				Already have an account? <Link to="/sign-in">Sign in</Link>
			</p>
		</AuthFrame>
	);
}
