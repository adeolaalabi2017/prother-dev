import type { Metadata } from "next";
import { AdminDashboard } from "@/components/prother/admin-console";

/**
 * /admin — the Admin Console as a real route (Task 20-c).
 * The page itself is a shell: management UI only renders after the
 * x-admin-key unlock (sessionStorage `prother_editor_key`), and every
 * /api/admin/** route enforces the key server-side anyway.
 */
export const metadata: Metadata = {
  title: "Admin · Prother",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
