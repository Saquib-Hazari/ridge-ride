import { createFileRoute } from "@tanstack/react-router";
import { CartPage } from "../components/store-pages";
export const Route = createFileRoute("/cart")({ component: CartPage });
