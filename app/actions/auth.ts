"use server";

import { redirect } from "next/navigation";
import { authenticate, createAccount, setSessionCookie, clearSessionCookie, acceptInvite } from "@/lib/auth";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const result = authenticate(email, password);
  if (!result) redirect("/login?error=" + encodeURIComponent("Invalid email or password"));
  setSessionCookie(result.userId);
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");
  const teamName = String(formData.get("team_name") ?? "My Team");
  if (password.length < 6) {
    redirect("/login?error=" + encodeURIComponent("Password must be at least 6 characters"));
  }
  try {
    const { userId } = createAccount({ email, password, fullName, teamName });
    setSessionCookie(userId);
  } catch (e: any) {
    redirect("/login?error=" + encodeURIComponent(e.message ?? "Sign up failed"));
  }
  redirect("/dashboard");
}

export async function logout() {
  clearSessionCookie();
  redirect("/login");
}

export async function acceptInviteAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");
  try {
    const { userId } = acceptInvite(token, { email, password, fullName });
    setSessionCookie(userId);
  } catch (e: any) {
    redirect(`/invite/${token}?error=` + encodeURIComponent(e.message ?? "Failed to join"));
  }
  redirect("/dashboard");
}
