import AppShell from "@/components/AppShell";
import EvidenceCard from "@/components/EvidenceCard";
import { alerts } from "@/lib/demo";

export default function Alerts() {
  const open = alerts.filter((a) => a.status !== "ok");
  const cleared = alerts.filter((a) => a.status === "ok");
  return (
    <AppShell active="alerts">
      <div className="page">
        <h1>Alerts</h1>
        <p className="lead">
          Evidence-first events across misalignment, oversized load, and
          splice/clips. Thumbnails show the overlay that triggered the call.
        </p>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Open</h2>
        <div className="evidence-list">
          {open.map((a) => (
            <EvidenceCard key={a.id} alert={a} />
          ))}
        </div>
        <h2 style={{ fontSize: 16, margin: "28px 0 12px" }}>Cleared</h2>
        <div className="evidence-list">
          {cleared.map((a) => (
            <EvidenceCard key={a.id} alert={a} compact />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
