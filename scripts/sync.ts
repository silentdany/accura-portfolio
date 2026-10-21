/** Local one-shot sync: pnpm sync (env from .env via tsx --env-file). */
import { runSync } from "@/lib/sync";

runSync("api")
  .then((stats) => {
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
