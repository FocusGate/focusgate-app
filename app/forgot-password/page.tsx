import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password — Raven",
  description: "Get a link to reset your Raven password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
