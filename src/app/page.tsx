import { Suspense } from "react";
import { connection } from "next/server";
import { headers } from "next/headers";
import { getIdentity } from "../../cursor/identity";
import { ShipLog } from "../components/ship-log";
import { listEntries } from "../lib/entries";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="page-shell">
      <div className="atmosphere" aria-hidden="true" />
      {children}
    </main>
  );
}

function LoadingFallback() {
  return (
    <Shell>
      <header className="hero">
        <p className="brand">Ship Log</p>
        <h1 className="headline">Opening your log…</h1>
        <p className="lede">Loading private notes for this viewer.</p>
      </header>
    </Shell>
  );
}

async function LogHome() {
  await connection();
  const identity = await getIdentity(await headers());

  if (!identity.verified || identity.kind !== "person") {
    return (
      <Shell>
        <header className="hero">
          <p className="brand">Ship Log</p>
          <h1 className="headline">Sign in to open your log</h1>
          <p className="lede">
            This private app needs a signed-in Cursor viewer before it can show
            or save notes.
          </p>
        </header>
      </Shell>
    );
  }

  const entries = await listEntries(identity.sub, identity.stage);

  return (
    <ShipLog
      viewer={{
        name: identity.name,
        email: identity.email,
        simulated: identity.simulated,
        stage: identity.stage,
      }}
      initialEntries={entries}
    />
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LogHome />
    </Suspense>
  );
}
