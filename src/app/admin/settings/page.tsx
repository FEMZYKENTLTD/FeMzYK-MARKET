import SettingsManager from "./SettingsManager";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Settings</h1>
      <p className="text-sm text-mist-400 mb-6">Business configuration. Payment provider keys live in environment variables — never stored in the database or exposed to the frontend.</p>
      <SettingsManager />
    </div>
  );
}
