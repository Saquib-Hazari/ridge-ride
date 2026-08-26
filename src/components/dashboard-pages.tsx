import { useClerk, useUser } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import {
	Activity,
	BarChart3,
	BookOpen,
	Box,
	Camera,
	ChevronDown,
	ChevronRight,
	CircleDollarSign,
	ClipboardList,
	ImagePlus,
	LayoutDashboard,
	PackageCheck,
	Settings,
	ShoppingBag,
	Truck,
	Users,
} from "lucide-react";
import { useState } from "react";
import {
	Bar,
	BarChart,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { formatCurrency } from "../features/catalog/domain";
import type {
	AddressRecord,
	AdminDashboardData,
	CustomerDashboardData,
} from "../features/dashboard/dashboard-server";
import {
	createBlogPost,
	deleteCustomerAddress,
	deleteCustomerAvatar,
	saveCustomerAddress,
	saveCustomerAvatar,
	updateCustomerProfile,
	updateOrderStatus,
} from "../features/dashboard/dashboard-server";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

function DashboardShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="store-page dashboard-page">
			<a className="skip-link" href="#dashboard-content">
				Skip to content
			</a>
			<SiteHeader />
			<main id="dashboard-content">{children}</main>
			<SiteFooter />
		</div>
	);
}

export function CustomerDashboard({
	data,
}: {
	data: CustomerDashboardData | null;
}) {
	const clerk = useClerk();
	const [avatar, setAvatar] = useState(data?.account.avatarDataUrl || "");
	const [message, setMessage] = useState("");
	const [saving, setSaving] = useState(false);

	async function uploadAvatar(file: File | undefined) {
		if (!file) return;
		if (!/image\/(png|jpeg|webp)/.test(file.type) || file.size > 1_000_000) {
			setMessage("Use a PNG, JPEG, or WebP image smaller than 1 MB.");
			return;
		}
		setSaving(true);
		setMessage("");
		try {
			const avatarDataUrl = await readFile(file);
			const result = await saveCustomerAvatar({ data: { avatarDataUrl } });
			setAvatar(result.avatarDataUrl);
			setMessage("Your profile image was replaced securely.");
		} catch {
			setMessage("We could not update your avatar. Please try again.");
		} finally {
			setSaving(false);
		}
	}
	async function removeAvatar() {
		setSaving(true);
		try {
			await deleteCustomerAvatar({ data: {} });
			setAvatar("");
			setMessage("Profile image removed.");
		} catch {
			setMessage("We could not remove your avatar. Please try again.");
		} finally {
			setSaving(false);
		}
	}

	if (!data) {
		return (
			<DashboardShell>
				<section className="dashboard-gate page-width">
					<h1>Sign in to view your dashboard.</h1>
					<p>Your orders and profile are available only to you.</p>
					<Link className="button button-primary" to="/sign-in">
						Sign in
					</Link>
				</section>
			</DashboardShell>
		);
	}

	return (
		<DashboardShell>
			<section className="page-width customer-dashboard">
				<aside className="dashboard-sidebar">
					<p className="eyebrow">Dashboard</p>
					<a href="#profile">
						<Settings /> Profile
					</a>
					<a href="#orders">
						<ShoppingBag /> Orders
					</a>
					<button onClick={() => clerk.openUserProfile()} type="button">
						<Users /> Account security
					</button>
					{data.account.email === "saquibhazari1000@gmail.com" ? (
						<Link to="/admin">
							<LayoutDashboard /> Admin dashboard
						</Link>
					) : null}
				</aside>
				<div className="dashboard-main">
					<section className="dashboard-panel" id="profile">
						<div className="dashboard-panel-heading">
							<div>
								<p className="eyebrow">Profile</p>
								<h2>Personal details</h2>
							</div>
							<button
								className="button"
								onClick={() => clerk.openUserProfile()}
								type="button"
							>
								Edit account <ChevronRight />
							</button>
						</div>
						<div className="profile-summary">
							<label className="avatar-upload">
								<input
									accept="image/png,image/jpeg,image/webp"
									disabled={saving}
									onChange={(event) => uploadAvatar(event.target.files?.[0])}
									type="file"
								/>
								<span>
									{avatar ? (
										<img alt="Your profile" src={avatar} />
									) : (
										data.account.displayName.slice(0, 1).toUpperCase()
									)}
									<Camera />
								</span>
								<small>{saving ? "Saving…" : "Replace avatar"}</small>
								<small style={{ color: "#ff8f86" }}>
									PNG, JPEG, or WebP · max 1 MB
								</small>
							</label>
							{avatar ? (
								<button
									className="button avatar-remove"
									onClick={removeAvatar}
									type="button"
								>
									Remove image
								</button>
							) : null}
							<dl>
								<div>
									<dt>Name</dt>
									<dd>{data.account.displayName}</dd>
								</div>
								<div>
									<dt>Email</dt>
									<dd>{data.account.email}</dd>
								</div>
								<div>
									<dt>Phone</dt>
									<dd>{data.account.phone || "Not added"}</dd>
								</div>
							</dl>
						</div>
						<p className="dashboard-note">
							Name, email, phone number, and password are managed in Clerk’s
							secure profile editor. Your Ridge &amp; Ride avatar is stored in
							the store database and replaces the old file on upload.
						</p>
						<output aria-live="polite">{message}</output>
					</section>
					<CustomerAccountEditor data={data} />
					<PurchaseHistoryChart history={data.purchaseHistory} />
					<section className="dashboard-panel" id="orders">
						<div className="dashboard-panel-heading">
							<div>
								<p className="eyebrow">Orders</p>
								<h2>Your purchases</h2>
							</div>
						</div>
						{data.orders.length ? (
							<OrderTable orders={data.orders} />
						) : (
							<div className="dashboard-empty dashboard-empty-orders">
								<span className="empty-state-icon">
									<PackageCheck />
								</span>
								<div>
									<h3>Your first ride is waiting.</h3>
									<p>
										Completed purchases, receipts, and delivery updates will
										appear here.
									</p>
								</div>
								<Link
									className="button button-primary"
									search={{ page: 1 }}
									to="/mountain-bikes"
								>
									Explore bikes <ChevronRight />
								</Link>
							</div>
						)}
					</section>
				</div>
			</section>
		</DashboardShell>
	);
}

function PurchaseHistoryChart({
	history,
}: {
	history: CustomerDashboardData["purchaseHistory"];
}) {
	return (
		<section className="dashboard-panel purchase-history" id="purchase-history">
			<div className="dashboard-panel-heading">
				<div>
					<p className="eyebrow">Purchase history</p>
					<h2>Spending over time</h2>
				</div>
			</div>
			{history.length ? (
				<div
					className="dashboard-chart"
					aria-label="Purchase history by month"
					role="img"
				>
					<ResponsiveContainer height={230} width="100%">
						<BarChart
							data={history}
							margin={{ bottom: 8, left: 4, right: 8, top: 8 }}
						>
							<XAxis dataKey="month" tick={{ fill: "#b2b2b2", fontSize: 11 }} />
							<YAxis
								axisLine={false}
								tick={{ fill: "#b2b2b2", fontSize: 11 }}
								tickFormatter={(value) => `$${Math.round(value / 100)}`}
								tickLine={false}
							/>
							<Tooltip formatter={(value) => formatCurrency(Number(value))} />
							<Bar
								dataKey="totalCents"
								fill="#7bcdb2"
								name="Purchases"
								radius={[6, 6, 0, 0]}
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			) : (
				<p className="dashboard-note">
					Your purchase history will appear after your first completed order.
				</p>
			)}
		</section>
	);
}

function CustomerAccountEditor({ data }: { data: CustomerDashboardData }) {
	const [profile, setProfile] = useState({
		displayName: data.account.displayName,
		phone: data.account.phone || "",
	});
	const [address, setAddress] = useState({
		id: "",
		fullName: data.account.displayName,
		line1: "",
		line2: "",
		city: "",
		region: "",
		postalCode: "",
		countryCode: "US",
		phone: data.account.phone || "",
	});
	const [message, setMessage] = useState("");
	const [addresses, setAddresses] = useState<AddressRecord[]>(data.addresses);
	const updateAddress =
		(key: keyof typeof address) =>
		(event: React.ChangeEvent<HTMLInputElement>) =>
			setAddress((current) => ({ ...current, [key]: event.target.value }));
	async function saveProfile(event: React.FormEvent) {
		event.preventDefault();
		setMessage("");
		try {
			await updateCustomerProfile({ data: profile });
			setMessage("Profile saved.");
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : "Profile could not be saved.",
			);
		}
	}
	async function saveAddress(event: React.FormEvent) {
		event.preventDefault();
		setMessage("");
		try {
			const result = await saveCustomerAddress({ data: address });
			const next = { ...address, id: result.id } as AddressRecord;
			setAddresses((current) => [
				next,
				...current.filter((item) => item.id !== result.id),
			]);
			setAddress((current) => ({ ...current, id: result.id }));
			setMessage("Address saved.");
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : "Address could not be saved.",
			);
		}
	}
	async function removeAddress(id: string) {
		try {
			await deleteCustomerAddress({ data: { id } });
			setAddresses((current) => current.filter((item) => item.id !== id));
			setMessage("Address removed.");
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: "Address could not be removed.",
			);
		}
	}
	function editAddress(item: AddressRecord) {
		setAddress({
			...item,
			countryCode: item.countryCode.toUpperCase(),
			line2: item.line2 || "",
			phone: item.phone || "",
		});
		setMessage("Address loaded for editing.");
		document
			.getElementById("address-form")
			?.scrollIntoView({ behavior: "smooth", block: "center" });
	}
	return (
		<section className="dashboard-panel account-editor" id="details">
			<div className="dashboard-panel-heading">
				<div>
					<p className="eyebrow">Account details</p>
					<h2>Saved information</h2>
				</div>
			</div>
			<form className="account-editor-form" onSubmit={saveProfile}>
				<div>
					<label>
						Name
						<input
							autoComplete="name"
							onChange={(event) =>
								setProfile((current) => ({
									...current,
									displayName: event.target.value,
								}))
							}
							required
							value={profile.displayName}
						/>
					</label>
					<label>
						Phone
						<input
							autoComplete="tel"
							onChange={(event) =>
								setProfile((current) => ({
									...current,
									phone: event.target.value,
								}))
							}
							value={profile.phone}
						/>
					</label>
				</div>
				<button className="button button-primary" type="submit">
					Save profile
				</button>
			</form>
			<div className="saved-addresses">
				<p className="eyebrow">Delivery addresses</p>
				{addresses.length ? (
					addresses.map((item) => (
						<article key={item.id}>
							<div>
								<strong>{item.fullName}</strong>
								<span>
									{item.line1}
									{item.line2 ? `, ${item.line2}` : ""}, {item.city},{" "}
									{item.region} {item.postalCode}, {item.countryCode}
								</span>
							</div>
							<div className="saved-address-actions">
								<button onClick={() => editAddress(item)} type="button">
									Edit
								</button>
								<button onClick={() => removeAddress(item.id)} type="button">
									Remove
								</button>
							</div>
						</article>
					))
				) : (
					<p className="dashboard-note">No saved addresses yet.</p>
				)}
			</div>
			<form
				className="account-editor-form address-form"
				id="address-form"
				onSubmit={saveAddress}
			>
				<p className="eyebrow">Add or update an address</p>
				<div>
					<label>
						Full name
						<input
							autoComplete="shipping name"
							onChange={updateAddress("fullName")}
							required
							value={address.fullName}
						/>
					</label>
					<label>
						Phone
						<input
							autoComplete="shipping tel"
							onChange={updateAddress("phone")}
							value={address.phone}
						/>
					</label>
					<label className="form-wide">
						Address line 1
						<input
							autoComplete="shipping address-line1"
							onChange={updateAddress("line1")}
							required
							value={address.line1}
						/>
					</label>
					<label className="form-wide">
						Address line 2
						<input
							autoComplete="shipping address-line2"
							onChange={updateAddress("line2")}
							value={address.line2}
						/>
					</label>
					<label>
						City
						<input
							autoComplete="shipping address-level2"
							onChange={updateAddress("city")}
							required
							value={address.city}
						/>
					</label>
					<label>
						State / region
						<input
							autoComplete="shipping address-level1"
							onChange={updateAddress("region")}
							required
							value={address.region}
						/>
					</label>
					<label>
						Postal code
						<input
							autoComplete="shipping postal-code"
							onChange={updateAddress("postalCode")}
							required
							value={address.postalCode}
						/>
					</label>
					<label>
						Country code
						<input
							autoComplete="shipping country"
							maxLength={2}
							onChange={updateAddress("countryCode")}
							required
							value={address.countryCode}
						/>
					</label>
				</div>
				<button className="button" type="submit">
					Save address
				</button>
			</form>
			<output aria-live="polite">{message}</output>
		</section>
	);
}

export function AdminDashboard({ data }: { data: AdminDashboardData | null }) {
	const [tab, setTab] = useState<"overview" | "orders" | "catalogue" | "blog">(
		"overview",
	);
	const { user } = useUser();
	if (!data)
		return (
			<DashboardShell>
				<section className="dashboard-gate page-width">
					<h1>Admin access required.</h1>
					<p>
						This private workspace is available only to the Ridge &amp; Ride
						administrator.
					</p>
					<Link className="button button-primary" to="/">
						Return home
					</Link>
				</section>
			</DashboardShell>
		);
	const page = {
		overview: {
			title: "Store performance",
			copy: "Track revenue, order flow, delivery progress, and the operational signals that need attention.",
		},
		orders: {
			title: "Order operations",
			copy: "Review the latest customer orders and keep delivery status accurate as your fulfilment workflow grows.",
		},
		catalogue: {
			title: "Catalogue management",
			copy: "Review the live product range and prepare the secure inventory and product actions used to maintain it.",
		},
		blog: {
			title: "Editorial publishing",
			copy: "Create helpful, structured rider guides in MDX and publish them when they are ready for the shop.",
		},
	}[tab];
	const displayName = user?.fullName || user?.firstName || "Administrator";
	return (
		<DashboardShell>
			<section className="admin-layout page-width">
				<aside className="admin-sidebar">
					<Link
						className="admin-profile"
						search={{ admin: true }}
						to="/account"
					>
						{user?.imageUrl ? (
							<img alt="" src={user.imageUrl} />
						) : (
							<span aria-hidden="true">
								{displayName.slice(0, 1).toUpperCase()}
							</span>
						)}
						<div>
							<strong>{displayName}</strong>
							<small>Administrator</small>
						</div>
					</Link>
					<p className="eyebrow">Store operations</p>
					<AdminNav
						active={tab}
						icon={<LayoutDashboard />}
						label="Overview"
						onClick={() => setTab("overview")}
					/>
					<AdminNav
						active={tab}
						icon={<ClipboardList />}
						label="Orders"
						onClick={() => setTab("orders")}
					/>
					<AdminNav
						active={tab}
						icon={<Box />}
						label="Catalogue"
						onClick={() => setTab("catalogue")}
					/>
					<AdminNav
						active={tab}
						icon={<BookOpen />}
						label="Blog"
						onClick={() => setTab("blog")}
					/>
					<Link search={{ admin: true }} to="/account">
						<Settings /> My account
					</Link>
				</aside>
				<div className="admin-main">
					<header className="admin-topbar">
						<div>
							<p className="eyebrow">Admin dashboard</p>
							<h1>{page.title}</h1>
							<p>{page.copy}</p>
						</div>
						<span>
							<Activity /> Live database
						</span>
					</header>
					{tab === "overview" ? <AdminOverview data={data} /> : null}
					{tab === "orders" ? <AdminOrders orders={data.recentOrders} /> : null}
					{tab === "catalogue" ? <AdminCatalogue /> : null}
					{tab === "blog" ? <AdminBlog posts={data.posts} /> : null}
				</div>
			</section>
		</DashboardShell>
	);
}

function AdminNav({
	active,
	icon,
	label,
	onClick,
}: {
	active: string;
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			aria-current={
				active === label.toLowerCase() ||
				(label === "Overview" && active === "overview")
					? "page"
					: undefined
			}
			onClick={onClick}
			type="button"
		>
			{icon}
			{label}
		</button>
	);
}

function AdminOverview({ data }: { data: AdminDashboardData }) {
	const metrics = [
		{
			label: "Revenue",
			value: formatCurrency(data.metrics.revenueCents),
			icon: <CircleDollarSign />,
		},
		{
			label: "Estimated profit",
			value: formatCurrency(data.metrics.profitCents),
			icon: <BarChart3 />,
		},
		{
			label: "Delivery pending",
			value: String(data.metrics.pending),
			icon: <Truck />,
		},
		{
			label: "Delivered",
			value: String(data.metrics.delivered),
			icon: <PackageCheck />,
		},
	];
	return (
		<>
			<section className="overview-context">
				<div>
					<p className="eyebrow">Operational overview</p>
					<h2>Everything important, in one place.</h2>
					<p>
						These figures update from the live orders database. Once checkout is
						connected, this view becomes the daily starting point for fulfilment
						and commercial reporting.
					</p>
				</div>
				<Link className="text-link" to="/mountain-bikes" search={{ page: 1 }}>
					View storefront <ChevronRight />
				</Link>
			</section>
			<div className="metric-grid">
				{metrics.map((metric) => (
					<article key={metric.label}>
						<span>{metric.icon}</span>
						<p>{metric.label}</p>
						<strong>{metric.value}</strong>
					</article>
				))}
			</div>
			<div className="admin-chart-grid">
				<section className="dashboard-panel">
					<h2>Revenue by month</h2>
					<p className="panel-description">
						Paid and fulfilled order revenue during the last five months.
					</p>
					{data.monthlyRevenue.length ? (
						<ResponsiveContainer height={260} width="100%">
							<BarChart data={data.monthlyRevenue}>
								<XAxis dataKey="month" stroke="#a3aaa6" />
								<YAxis
									tickFormatter={(value) => `$${Math.round(value / 100)}`}
									stroke="#a3aaa6"
								/>
								<Tooltip formatter={(value) => formatCurrency(Number(value))} />
								<Bar dataKey="revenue" fill="#7bcdb2" radius={[8, 8, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					) : (
						<ChartEmpty label="Revenue will appear after paid orders are recorded." />
					)}
				</section>
				<section className="dashboard-panel">
					<h2>Order status</h2>
					<p className="panel-description">
						A live breakdown of fulfilment and exception statuses.
					</p>
					{data.orderStatuses.length ? (
						<ResponsiveContainer height={260} width="100%">
							<PieChart>
								<Pie
									data={data.orderStatuses}
									dataKey="value"
									nameKey="name"
									outerRadius={90}
								>
									{data.orderStatuses.map((entry, index) => (
										<Cell
											fill={
												["#7bcdb2", "#e5f36a", "#f4976c", "#7c8cff"][index % 4]
											}
											key={entry.name}
										/>
									))}
								</Pie>
								<Tooltip />
								<Legend />
							</PieChart>
						</ResponsiveContainer>
					) : (
						<ChartEmpty label="Delivery status will appear after orders are recorded." />
					)}
				</section>
			</div>
			<AdminOrders orders={data.recentOrders} />
		</>
	);
}
function ChartEmpty({ label }: { label: string }) {
	return (
		<div className="chart-empty">
			<BarChart3 />
			<p>{label}</p>
		</div>
	);
}
function AdminOrders({
	orders,
}: {
	orders: AdminDashboardData["recentOrders"];
}) {
	const [message, setMessage] = useState("");
	async function update(orderNumber: string, status: "fulfilled" | "refunded") {
		setMessage("Updating…");
		try {
			await updateOrderStatus({ data: { orderNumber, status } });
			setMessage(
				`Order ${orderNumber} marked ${status}. Refresh to see the latest status.`,
			);
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : "Could not update the order.",
			);
		}
	}
	return (
		<section className="dashboard-panel admin-orders">
			<div className="dashboard-panel-heading">
				<div>
					<p className="eyebrow">Operations</p>
					<h2>Recent orders</h2>
				</div>
			</div>
			<output aria-live="polite">{message}</output>
			{orders.length ? (
				<>
					<OrderTable orders={orders} />
					<div className="admin-order-actions">
						{orders
							.filter((order) => order.status === "paid")
							.map((order) => (
								<div key={order.orderNumber}>
									<span>{order.orderNumber}</span>
									<button
										className="button"
										onClick={() => update(order.orderNumber, "fulfilled")}
										type="button"
									>
										Mark shipped
									</button>
									<button
										className="button"
										onClick={() => update(order.orderNumber, "refunded")}
										type="button"
									>
										Refund
									</button>
								</div>
							))}
					</div>
				</>
			) : (
				<div className="dashboard-empty">
					<Truck />
					<h3>No orders recorded.</h3>
					<p>
						Revenue, profit, and delivery charts automatically update when
						checkout orders are connected.
					</p>
				</div>
			)}
		</section>
	);
}
function AdminCatalogue() {
	return (
		<section className="dashboard-panel catalogue-intro">
			<p className="eyebrow">Catalogue</p>
			<h2>Product control is ready for secure admin actions.</h2>
			<p className="dashboard-note">
				Browse the active customer-facing catalogue today. Product changes and
				inventory adjustments will use this same private, server-validated
				workspace when the next management actions are connected.
			</p>
			<div className="catalogue-action-row">
				<Link
					className="button button-primary"
					search={{ page: 1 }}
					to="/mountain-bikes"
				>
					View live catalogue
				</Link>
				<span>Only your administrator account can access this workspace.</span>
			</div>
		</section>
	);
}
function AdminBlog({ posts }: { posts: AdminDashboardData["posts"] }) {
	const [title, setTitle] = useState("");
	const [excerpt, setExcerpt] = useState("");
	const [content, setContent] = useState(
		"# Start with a useful answer\n\nWrite the rider guide here using MDX.",
	);
	const [coverImageDataUrl, setCoverImageDataUrl] = useState("");
	const [status, setStatus] = useState("draft");
	const [message, setMessage] = useState("");
	const [saving, setSaving] = useState(false);

	async function chooseCover(file: File | undefined) {
		if (!file) return;
		if (!/image\/(png|jpeg|webp)/.test(file.type) || file.size > 2_000_000) {
			setMessage("Use a PNG, JPEG, or WebP cover image smaller than 2 MB.");
			return;
		}
		setCoverImageDataUrl(await readFile(file));
	}

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setMessage("");
		try {
			const post = await createBlogPost({
				data: { title, excerpt, content, coverImageDataUrl, status },
			});
			setMessage(`Saved /${post.slug} as ${status}.`);
			setTitle("");
			setExcerpt("");
			setContent(
				"# Start with a useful answer\n\nWrite the rider guide here using MDX.",
			);
			setCoverImageDataUrl("");
		} catch {
			setMessage(
				"Could not save this article. Check the MDX syntax and choose a unique title.",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="admin-blog-grid">
			<section className="dashboard-panel admin-composer">
				<div className="admin-composer-heading">
					<div>
						<p className="eyebrow">New article</p>
						<h2>Publish a rider guide</h2>
						<p>
							Write structured content in MDX and add a cover image from your
							computer.
						</p>
					</div>
				</div>
				<form className="admin-blog-form" onSubmit={submit}>
					<div className="composer-meta">
						<label>
							<span className="form-label">Title</span>
							<input
								maxLength={140}
								onChange={(event) => setTitle(event.target.value)}
								placeholder="e.g. How to choose a trail bike"
								required
								value={title}
							/>
						</label>
						<label>
							<span className="form-label">Summary</span>
							<input
								maxLength={320}
								onChange={(event) => setExcerpt(event.target.value)}
								placeholder="A concise reader-first summary"
								required
								value={excerpt}
							/>
						</label>
					</div>
					<label className="cover-upload">
						<span className="form-label">Cover image</span>
						<input
							accept="image/png,image/jpeg,image/webp"
							onChange={(event) => chooseCover(event.target.files?.[0])}
							type="file"
						/>
						<span className="cover-upload-dropzone">
							{coverImageDataUrl ? (
								<img alt="Selected blog cover" src={coverImageDataUrl} />
							) : (
								<>
									<ImagePlus />
									<strong>Upload cover image</strong>
									<small>PNG, JPEG, or WebP · up to 2 MB</small>
								</>
							)}
						</span>
					</label>
					<label className="mdx-field">
						<span className="form-label">MDX article source</span>
						<textarea
							maxLength={12000}
							minLength={80}
							onChange={(event) => setContent(event.target.value)}
							required
							rows={16}
							spellCheck="false"
							value={content}
						/>
						<small>
							MDX supports headings, lists, links, emphasis, and safe JSX.
							Imports and exports are blocked.
						</small>
					</label>
					<div className="composer-actions">
						<label>
							<span className="form-label">Status</span>
							<span className="select-control">
								<select
									onChange={(event) => setStatus(event.target.value)}
									value={status}
								>
									<option value="draft">Save as draft</option>
									<option value="published">Publish now</option>
								</select>
								<ChevronDown aria-hidden="true" />
							</span>
						</label>
						<button
							className="button button-primary"
							disabled={saving}
							type="submit"
						>
							{saving ? "Validating MDX…" : "Save article"}
						</button>
					</div>
					<output aria-live="polite">{message}</output>
				</form>
			</section>
			<section className="dashboard-panel article-library">
				<p className="eyebrow">Library</p>
				<h2>Recent articles</h2>
				{posts.length ? (
					<ul className="post-list">
						{posts.map((post) => (
							<li key={post.id}>
								<div>
									<strong>{post.title}</strong>
									<span>/{post.slug}</span>
								</div>
								<small>{post.status}</small>
							</li>
						))}
					</ul>
				) : (
					<div className="dashboard-empty">
						<BookOpen />
						<h3>No articles yet.</h3>
						<p>Draft or publish the first rider guide with the composer.</p>
					</div>
				)}
			</section>
		</div>
	);
}
function OrderTable({
	orders,
}: {
	orders: {
		createdAt: string;
		orderNumber: string;
		status: string;
		totalCents: number;
	}[];
}) {
	return (
		<div className="order-table-wrap">
			<table className="order-table">
				<thead>
					<tr>
						<th>Order</th>
						<th>Date</th>
						<th>Status</th>
						<th>Total</th>
					</tr>
				</thead>
				<tbody>
					{orders.map((order) => (
						<tr key={order.orderNumber}>
							<td>{order.orderNumber}</td>
							<td>
								{new Intl.DateTimeFormat("en-US", {
									dateStyle: "medium",
								}).format(new Date(order.createdAt))}
							</td>
							<td>
								<span className={`order-status status-${order.status}`}>
									{order.status}
								</span>
							</td>
							<td>{formatCurrency(order.totalCents)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
function readFile(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error);
		reader.onload = () =>
			typeof reader.result === "string"
				? resolve(reader.result)
				: reject(new Error("Invalid image"));
		reader.readAsDataURL(file);
	});
}
