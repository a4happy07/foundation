import { requireIdentity } from "../../../../../cursor/identity";
import { deleteEntry, setEntryDone } from "../../../../lib/entries";

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

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const identity = personOr401(await requireIdentity(request));
  if (identity instanceof Response) return identity;

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) {
    return Response.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: noStore });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("done" in body) ||
    typeof (body as { done: unknown }).done !== "boolean"
  ) {
    return Response.json({ error: "invalid_body" }, { status: 400, headers: noStore });
  }

  const entry = await setEntryDone(
    identity.sub,
    identity.stage,
    id,
    (body as { done: boolean }).done,
  );
  if (!entry) {
    return Response.json({ error: "not_found" }, { status: 404, headers: noStore });
  }
  return Response.json({ entry }, { headers: noStore });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const identity = personOr401(await requireIdentity(_request));
  if (identity instanceof Response) return identity;

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) {
    return Response.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const deleted = await deleteEntry(identity.sub, identity.stage, id);
  if (!deleted) {
    return Response.json({ error: "not_found" }, { status: 404, headers: noStore });
  }
  return new Response(null, { status: 204, headers: noStore });
}
