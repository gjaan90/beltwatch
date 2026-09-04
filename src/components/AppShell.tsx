import Link from "next/link";

export default function AppShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: "plant" | "alerts" | "settings" | "models";
}) {
  return (
    <div className="shell">
      <header className="top">
        <Link href="/" className="brand-link">
          <img className="logo" src="/skf-logo.png" alt="SKF" />
          <div className="brand">
            <strong>BELTSIGHT</strong>
            <span>Misalignment · oversize · splice</span>
          </div>
        </Link>
        <nav className="nav">
          <Link className={active === "plant" ? "on" : ""} href="/plant">
            Plant
          </Link>
          <Link className={active === "alerts" ? "on" : ""} href="/alerts">
            Alerts
          </Link>
          <Link className={active === "models" ? "on" : ""} href="/models">
            Models
          </Link>
          <Link className={active === "settings" ? "on" : ""} href="/settings">
            Settings
          </Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="foot">
        SKF Australia · BeltSight preview · mock inference until Roboflow weights
        are loaded
      </footer>
    </div>
  );
}
