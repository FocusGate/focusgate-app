import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password — FocusGate",
  description: "Get a link to reset your FocusGate password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
