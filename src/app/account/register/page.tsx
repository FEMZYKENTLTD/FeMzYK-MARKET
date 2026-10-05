import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AuthForms from "../AuthForms";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage({ searchParams }: { searchParams: { next?: string } }) {
  const user = getSessionUser();
  if (user) redirect("/account");
  return (
    <div className="container-page py-14 max-w-md mx-auto">
      <div className="text-center mb-8">
        <p className="eyebrow">Join FEMZYK MARKET</p>
        <h1 className="font-display text-3xl text-cream-50 mt-2">Create your account</h1>
        <p className="text-sm text-mist-400 mt-2">Track orders, access digital purchases and manage projects in one place.</p>
      </div>
      <AuthForms mode="register" next={searchParams.next} />
    </div>
  );
}
