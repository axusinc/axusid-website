import { redirect } from "next/navigation";

export default function DeveloperClientsPage() {
  redirect("/account?section=developer");
}
