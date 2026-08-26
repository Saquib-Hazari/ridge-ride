import { createFileRoute } from "@tanstack/react-router";
import { CustomSignUp } from "../components/custom-auth";
export const Route = createFileRoute("/sign-up")({ component: CustomSignUp });
