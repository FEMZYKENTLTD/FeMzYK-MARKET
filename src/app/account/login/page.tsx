import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AuthForms from "../AuthForms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getSessionUser();
  const nextPath = (await searchParams).next || "";
  if (user) redirect(nextPath.startsWith("/") ? nextPath : "/account");
  return (
    <div className="container-page py-14 max-w-md mx-auto">
      <div className="text-center mb-8">
        <p className="eyebrow">Your account</p>
        <h1 className="font-display text-3xl text-cream-50 mt-2">Welcome back</h1>
        <p className="text-sm text-mist-400 mt-2">Sign in to view orders, downloads and projects. Shopping never requires an account.</p>
      </div>
      <AuthForms mode="login" next={nextPath} />
    </div>
  );
}
