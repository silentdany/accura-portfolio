import type { NextRequest } from "next/server";
import { options, restTool } from "@/lib/rest";

export const GET = (req: NextRequest) => restTool(req, "list_stories", {});
export const OPTIONS = options;
