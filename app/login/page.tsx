import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — Raven",
  description: "Sign in to Raven and get back to your RavenLock sessions.",
};

export default function LoginPage() {
  return <LoginForm />;
}
