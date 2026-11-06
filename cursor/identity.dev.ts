// Cursor app identity: TypeScript mirror of identity.dev.js for local editing.
// Runtime resolves identity.dev.js (imported by identity.ts). Keep these in sync.

import type { DevViewer } from "./identity.js";

export const DEV_VIEWER: DevViewer | null = {
  sub: "user:dev",
  email: "dev@example.com",
  name: "Dev Viewer",
  teamId: 1,
  teamRole: "admin",
};
