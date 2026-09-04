import Link from "next/link";
import AppShell from "@/components/AppShell";
import { conveyors } from "@/lib/demo";

export default function Plant() {
  const sites = ["Demo Plant", "Iron Ridge", "Hunter Valley"];
  return (
    <AppShell active="plant">
      <div className="page">
        <h1>Plant</h1>
        <p className="lead">
          Demo sites with three detectors per conveyor. Live wander uses mock
          inference until Roboflow weights are mounted.
        </p>
        <div className="grid sites">
          {sites.map((site) => {
            const lines = conveyors.filter((c) => c.site === site);
            return (
              <section className="card" key={site}>
                <h2>{site}</h2>
                <div className="meta">
                  {lines[0]?.region} · {lines.length} conveyors
                </div>
                {lines.map((c) => (
                  <Link className="row" key={c.id} href={`/conveyor/${c.id}`}>
                    <span>
                      {c.name}
                      <div className="meta" style={{ margin: 0 }}>
                        {c.cameras} cameras · {c.material.replace("_", " ")} ·{" "}
                        {c.lastSeen}
                      </div>
                      <div className="mini-dets">
                        {c.detectors.map((d) => (
                          <span key={d.kind} className={d.status}>
                            {d.kind === "misalignment"
                              ? "align"
                              : d.kind === "oversize"
                                ? "load"
                                : "splice"}{" "}
                            {d.value}
                          </span>
                        ))}
                      </div>
                    </span>
                    <span className={`pill ${c.status}`}>{c.status}</span>
                  </Link>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
