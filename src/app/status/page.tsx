import type { Metadata } from "next";
import { StatusChecker } from "./status-checker";

export const metadata: Metadata = {
  title: "Status",
  description: "Live reachability of AXUS ID endpoints, checked from your browser right now.",
};

export default function StatusPage() {
  return <StatusChecker />;
}
