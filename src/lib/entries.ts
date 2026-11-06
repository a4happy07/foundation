import type { IdentityStage } from "../../cursor/identity";
import { sql } from "./db";

export type Entry = {
  id: number;
  body: string;
  done: boolean;
  created_at: string;
};

type EntryRow = {
  id: number | string;
  body: string;
  done: boolean;
  created_at: Date | string;
};

function mapEntry(row: EntryRow): Entry {
  return {
    id: Number(row.id),
    body: row.body,
    done: Boolean(row.done),
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

export async function listEntries(
  ownerSub: string,
  stage: IdentityStage,
): Promise<Entry[]> {
  const rows = await sql<EntryRow>(
    `select id, body, done, created_at
     from entries
     where owner_sub = $1 and stage = $2
     order by created_at desc
     limit 100`,
    [ownerSub, stage],
  );
  return rows.map(mapEntry);
}

export async function createEntry(
  ownerSub: string,
  stage: IdentityStage,
  body: string,
): Promise<Entry> {
  const rows = await sql<EntryRow>(
    `insert into entries (owner_sub, stage, body)
     values ($1, $2, $3)
     returning id, body, done, created_at`,
    [ownerSub, stage, body],
  );
  return mapEntry(rows[0]);
}

export async function setEntryDone(
  ownerSub: string,
  stage: IdentityStage,
  id: number,
  done: boolean,
): Promise<Entry | null> {
  const rows = await sql<EntryRow>(
    `update entries
     set done = $1
     where id = $2 and owner_sub = $3 and stage = $4
     returning id, body, done, created_at`,
    [done, id, ownerSub, stage],
  );
  return rows[0] ? mapEntry(rows[0]) : null;
}

export async function deleteEntry(
  ownerSub: string,
  stage: IdentityStage,
  id: number,
): Promise<boolean> {
  const rows = await sql<{ id: number | string }>(
    `delete from entries
     where id = $1 and owner_sub = $2 and stage = $3
     returning id`,
    [id, ownerSub, stage],
  );
  return rows.length > 0;
}
