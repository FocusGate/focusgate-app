import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — FocusGate",
  description: "Sign in to FocusGate and get back to your Locked In sessions.",
};

export default function LoginPage() {
  return <LoginForm />;
}
