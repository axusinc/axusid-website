import "server-only";

import { cookies } from "next/headers";
import {
  LAST_AUTH_METHOD_COOKIE,
  lastAuthMethodCookieOptions,
  isValidAuthMethod,
  type LastAuthMethod,
} from "@/lib/last-auth-method";

export async function getLastAuthMethod(): Promise<LastAuthMethod | null> {
  const cookieStore = await cookies();
  const val = cookieStore.get(LAST_AUTH_METHOD_COOKIE)?.value;
  return isValidAuthMethod(val) ? val : null;
}

export async function setLastAuthMethod(method: LastAuthMethod): Promise<void> {
  const cookieStore = await cookies();
  try {
    cookieStore.set(LAST_AUTH_METHOD_COOKIE, method, lastAuthMethodCookieOptions);
  } catch {
    // Cookies can only be modified in a Server Action or Route Handler.
  }
}
