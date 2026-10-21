import { cookies } from "next/headers";
import { getDefaultView } from "@/lib/settings";
import { isView, VIEW_COOKIE, type ViewId } from "@/lib/views";

/** ?view= wins, then the visitor's cookie, then the admin default. */
export async function resolveView(param: string | string[] | undefined): Promise<ViewId> {
  const p = Array.isArray(param) ? param[0] : param;
  if (isView(p)) return p;
  const c = (await cookies()).get(VIEW_COOKIE)?.value;
  if (isView(c)) return c;
  return getDefaultView();
}
