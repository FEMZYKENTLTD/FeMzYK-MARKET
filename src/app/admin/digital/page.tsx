import DigitalManager from "./DigitalManager";

export const dynamic = "force-dynamic";

export default function AdminDigitalPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Digital files & delivery</h1>
      <p className="text-sm text-mist-400 mb-6">
        Files live in private storage and are only served through signed, limit-checked download routes. Uploading a new
        version bumps the product version and notifies existing owners automatically.
      </p>
      <DigitalManager />
    </div>
  );
}
