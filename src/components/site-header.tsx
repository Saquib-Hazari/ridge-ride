import { Show, useUser } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Menu, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { readCart } from "../lib/cart";
import { AuthActions } from "./auth-actions";

const navigation = [
	{ label: "Bikes", to: "/mountain-bikes" },
	{ label: "Parts & gear", to: "/parts-gear" },
	{ label: "Apparel", to: "/apparel" },
	{ label: "Service", to: "/service" },
	{ label: "About", to: "/about" },
] as const;

export function SiteHeader() {
	const [menuOpen, setMenuOpen] = useState(false);
	const [cartQuantity, setCartQuantity] = useState(0);
	const { user } = useUser();
	useEffect(() => {
		const syncCart = () =>
			setCartQuantity(readCart().reduce((sum, line) => sum + line.quantity, 0));
		syncCart();
		window.addEventListener("ridge-cart-updated", syncCart);
		return () => window.removeEventListener("ridge-cart-updated", syncCart);
	});
	const isAdmin =
		user?.primaryEmailAddress?.emailAddress?.toLowerCase() ===
		"saquibhazari1000@gmail.com";

	return (
		<header className="site-header">
			<div className="utility-strip">
				<span>Free shipping on orders over $100</span>
				<span aria-hidden="true">•</span>
				<span>Workshop bookings open now</span>
			</div>
			<div className="main-nav-wrap">
				<Link aria-label="Ridge & Ride home" className="brand-mark" to="/">
					<img alt="Ridge & Ride" src="/images/ridge-ride-logo-lockup.png" />
				</Link>
				<nav aria-label="Primary navigation" className="desktop-nav">
					{navigation.map((item) => (
						<Link
							activeProps={{ className: "nav-link-active" }}
							key={item.to}
							to={item.to}
						>
							{item.label}
						</Link>
					))}
					<Show when="signed-in">
						{isAdmin ? (
							<Link activeProps={{ className: "nav-link-active" }} to="/admin">
								<LayoutDashboard aria-hidden="true" /> Admin
							</Link>
						) : (
							<Link
								activeProps={{ className: "nav-link-active" }}
								search={{ admin: false }}
								to="/account"
							>
								Dashboard
							</Link>
						)}
					</Show>
				</nav>
				<div className="nav-actions">
					<Link aria-label="Search" className="icon-button" to="/search">
						<Search strokeWidth={1.8} />
					</Link>
					<Link
						aria-label={`Cart${cartQuantity ? `, ${cartQuantity} items` : ""}`}
						className="icon-button cart-icon"
						to="/cart"
					>
						<ShoppingBag strokeWidth={1.8} />
						{cartQuantity ? (
							<span className="cart-badge">
								{cartQuantity > 99 ? "99+" : cartQuantity}
							</span>
						) : null}
					</Link>
					<div className="desktop-auth-actions desktop-only">
						<AuthActions className="auth-link" mode="sign-in" />
						<AuthActions
							className="signup-button"
							mode="sign-up"
							showUserWhenSignedIn
						/>
					</div>
					<Link className="service-button desktop-only" to="/service">
						Book a service
					</Link>
					<button
						aria-controls="mobile-menu"
						aria-expanded={menuOpen}
						aria-label={
							menuOpen ? "Close navigation menu" : "Open navigation menu"
						}
						className="icon-button menu-button"
						onClick={() => setMenuOpen((isOpen) => !isOpen)}
						type="button"
					>
						{menuOpen ? <X /> : <Menu />}
					</button>
				</div>
			</div>
			{menuOpen ? (
				<nav
					aria-label="Mobile navigation"
					className="mobile-nav"
					id="mobile-menu"
				>
					{navigation.map((item) => (
						<Link
							activeProps={{ className: "nav-link-active" }}
							key={item.to}
							onClick={() => setMenuOpen(false)}
							to={item.to}
						>
							{item.label}
						</Link>
					))}
					<Show when="signed-in">
						{isAdmin ? (
							<Link onClick={() => setMenuOpen(false)} to="/admin">
								Admin
							</Link>
						) : (
							<Link
								onClick={() => setMenuOpen(false)}
								search={{ admin: false }}
								to="/account"
							>
								Dashboard
							</Link>
						)}
					</Show>
					<Link
						className="service-button"
						onClick={() => setMenuOpen(false)}
						to="/service"
					>
						Book a service
					</Link>
					<div className="mobile-auth-actions">
						<AuthActions
							className="mobile-auth-button"
							onAction={() => setMenuOpen(false)}
							showUserWhenSignedIn
						/>
					</div>
				</nav>
			) : null}
		</header>
	);
}
