import { redirect } from "next/navigation";

/**
 * /call (no session id) — redirect to sessions list.
 * All real calls are at /call/[sessionId].
 */
export default function CallIndexPage() {
  redirect("/sessions");
}
