import { NextResponse } from "next/server";
import { getValidSession, removeAccountFromSession, clearAllSessions } from "@/lib/session-access";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const auid = searchParams.get("auid")?.trim();
  const session = await getValidSession();

  let remaining = null;
  if (session) {
    if (auid && session.auid !== auid) {
      remaining = await removeAccountFromSession(auid);
    } else {
      remaining = await removeAccountFromSession(session.auid);
    }
  } else {
    await clearAllSessions();
  }

  const destination = remaining ? "/account" : "/login?add_account=true";
  return NextResponse.redirect(new URL(destination, request.url), 303);
}

export async function POST(request: Request) {
  return GET(request);
}
