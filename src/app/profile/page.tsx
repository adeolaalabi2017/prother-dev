import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/lib/breadcrumbs";
import { ProfilePage } from "@/components/prother/profile-page";

/**
 * /profile — the unified account hub: profile header + tabbed
 * "My collections & follows" and "Saved" sections. Personal space, so the
 * page (and its ?tab= variants) never indexes — canonical folds to /profile.
 */
export const metadata: Metadata = {
  title: "Profile | Prother",
  robots: { index: false, follow: false },
  alternates: { canonical: "/profile" },
};

export default function Page() {
  return (
    <div className="bg-ink pb-16 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <Breadcrumbs
          trail={[{ name: "Home", href: "/" }, { name: "Profile" }]}
        />
        <Suspense>
          <ProfilePage />
        </Suspense>
      </div>
    </div>
  );
}
