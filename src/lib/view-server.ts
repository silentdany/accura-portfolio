import { getDefaultView } from "@/lib/settings";
import { isView, type ViewId } from "@/lib/views";

/** ?view= wins, otherwise the admin default. Nothing is remembered: a URL without the param is always the default. */
export async function resolveView(param: string | string[] | undefined): Promise<ViewId> {
  const p = Array.isArray(param) ? param[0] : param;
  if (isView(p)) return p;
  return getDefaultView();
}
