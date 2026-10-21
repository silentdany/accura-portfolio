import type { NextRequest } from "next/server";
import { options, restTool } from "@/lib/rest";

export const maxDuration = 300;

export const POST = (req: NextRequest) => restTool(req, "sync_projects", {});
export const OPTIONS = options;
