import { redirect } from "next/navigation";

export default function DeveloperSamlPage() {
  redirect("/account?section=developer");
}
