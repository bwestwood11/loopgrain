import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { clip, project } from "@/db/schema";
import { RAW_CLIP_RETENTION_DAYS } from "@/lib/pricing";
import { deleteObject } from "@/lib/r2";

// Deletes raw clips from projects delivered more than RAW_CLIP_RETENTION_DAYS
// ago, as the privacy policy promises. Vercel Cron calls this daily (see
// vercel.json) with `Authorization: Bearer $CRON_SECRET`. Projects waiting on
// a revision aren't "delivered", so their clips stay until the new edit is out.

export const maxDuration = 300;

// Caps one run; anything left over goes on the next day's run.
const BATCH = 500;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - RAW_CLIP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const expired = await db
    .select({ id: clip.id, storageKey: clip.storageKey })
    .from(clip)
    .innerJoin(project, eq(clip.projectId, project.id))
    .where(and(eq(project.status, "delivered"), lt(project.deliveredAt, cutoff)))
    .limit(BATCH);

  // The row goes only once R2 confirms the file is gone, so a failed delete is
  // retried tomorrow instead of leaving an orphaned file.
  let deleted = 0;
  let failed = 0;
  for (let i = 0; i < expired.length; i += 10) {
    await Promise.all(
      expired.slice(i, i + 10).map(async (c) => {
        try {
          await deleteObject(c.storageKey);
          await db.delete(clip).where(eq(clip.id, c.id));
          deleted++;
        } catch (err) {
          failed++;
          console.error(err);
        }
      }),
    );
  }

  console.log(`delete-old-clips: deleted ${deleted}, failed ${failed}`);
  return Response.json({ deleted, failed, more: expired.length === BATCH });
}
