import { createFileRoute } from "@tanstack/react-router";
import { CheckoutPage } from "../components/store-pages";
export const Route = createFileRoute("/checkout")({ component: CheckoutPage });
