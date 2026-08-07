import type { Metadata } from "next";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password — FocusGate",
  description: "Choose a new password for your FocusGate account.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
