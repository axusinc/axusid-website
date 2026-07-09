import { redirect } from "next/navigation";

export default function ClientDetailPage() {
  redirect("/account?section=developer");
}
