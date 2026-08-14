import type { Metadata } from "next";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create your account — Raven",
  description: "Join the Raven beta. Free during beta, no credit card needed.",
};

export default function SignupPage() {
  return <SignupForm />;
}
