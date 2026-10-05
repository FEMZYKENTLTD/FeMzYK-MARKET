import { getSessionUser } from "@/lib/auth";
import { q } from "@/lib/db";
import ProfileForm from "./ProfileForm";

export default function ProfilePage() {
  const user = getSessionUser()!;
  const row = q<any>("SELECT first_name, last_name, email, marketing_opt_in, created_at, role FROM users WHERE id = ?", user.id)[0];
  const addresses = q<any>("SELECT * FROM addresses WHERE user_id = ?", user.id);

  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-6">Profile & security</h1>
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400 mb-4">Account details</h2>
          <ProfileForm firstName={row.first_name || ""} lastName={row.last_name || ""} email={row.email} marketing={!!row.marketing_opt_in} />
        </div>
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400 mb-3">Security</h2>
            <ul className="space-y-2 text-sm text-mist-300">
              <li>✓ Password stored as a salted hash — never in plain text</li>
              <li>✓ Sessions expire automatically</li>
              <li>✓ Payment details are never stored by FEMZYK</li>
            </ul>
            <p className="text-xs text-mist-500 mt-4">
              To change your password, use <span className="text-mist-300">Forgot password</span> on the sign-in page — a secure reset link will be emailed to you.
            </p>
          </div>
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400 mb-3">Saved addresses</h2>
            {addresses.length === 0 ? (
              <p className="text-sm text-mist-500">Addresses you use at checkout can be saved here for faster ordering.</p>
            ) : (
              <ul className="space-y-2 text-sm text-mist-300">
                {addresses.map((a) => (
                  <li key={a.id}>
                    {a.label}: {a.line1}, {a.city}, {a.country}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400 mb-3">Member since</h2>
            <p className="text-sm text-cream-200">{new Date(row.created_at + "Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
