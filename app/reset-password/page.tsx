import type { Metadata } from "next";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password — Raven",
  description: "Choose a new password for your Raven account.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
