import { redirect } from "next/navigation";

/**
 * Tool submissions are paused (see SUBMISSIONS_ENABLED in lib/submit.ts).
 * The previous page lives in git history; restore it when re-enabling.
 */
export default function SubmitPage() {
  redirect("/");
}
