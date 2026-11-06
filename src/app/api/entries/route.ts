import { requireIdentity } from "../../../../cursor/identity";
import { createEntry, listEntries } from "../../../lib/entries";

const noStore = { "cache-control": "private, no-store" };

function personOr401(identity: Awaited<ReturnType<typeof requireIdentity>>) {
  if (identity instanceof Response) return identity;
  if (identity.kind !== "person") {
    return Response.json(
      { error: "forbidden", reason: "person_required" },
      { status: 403, headers: noStore },
    );
  }
  return identity;
}

export async function GET(request: Request) {
  const identity = personOr401(await requireIdentity(request));
  if (identity instanceof Response) return identity;

  const entries = await listEntries(identity.sub, identity.stage);
  return Response.json(
    {
      viewer: {
        name: identity.name,
        email: identity.email,
        simulated: identity.simulated,
        stage: identity.stage,
      },
      entries,
    },
    { headers: noStore },
  );
}

export async function POST(request: Request) {
  const identity = personOr401(await requireIdentity(request));
  if (identity instanceof Response) return identity;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: noStore });
  }

  const text =
    typeof body === "object" &&
    body !== null &&
    "body" in body &&
    typeof (body as { body: unknown }).body === "string"
      ? (body as { body: string }).body.trim()
      : "";

  if (text.length === 0 || text.length > 500) {
    return Response.json({ error: "invalid_body" }, { status: 400, headers: noStore });
  }

  const entry = await createEntry(identity.sub, identity.stage, text);
  return Response.json({ entry }, { status: 201, headers: noStore });
}
