import { createFileRoute } from "@tanstack/react-router";
import { CustomSignIn } from "../components/custom-auth";
export const Route = createFileRoute("/sign-in")({ component: CustomSignIn });
