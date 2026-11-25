// SayNow MCP server — lets Claude manage polls, blogs and images on saynow.in
// Put this file at:  app/api/mcp/route.ts
// Endpoint:          https://saynow.in/api/mcp?key=YOUR_MCP_SECRET

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { v2 as cloudinary } from "cloudinary";
import { revalidatePath } from "next/cache";

export const maxDuration = 60;

// ---------- config ----------
const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || process.env.DATABASE_URL || "";
const MCP_SECRET = process.env.MCP_SECRET || "";

// Collections Claude is never allowed to read or change (user accounts, logins).
const BLOCKED = new Set(["users", "accounts", "sessions", "verificationtokens", "admins"]);

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} // otherwise the SDK reads CLOUDINARY_URL automatically

// ---------- mongo (cached across requests) ----------
const g = globalThis as unknown as { _mcpMongo?: Promise<MongoClient> };
async function getDb(): Promise<Db> {
  if (!MONGO_URI) throw new Error("No MongoDB URI found in env (MONGODB_URI / MONGO_URI).");
  if (!g._mcpMongo) g._mcpMongo = new MongoClient(MONGO_URI).connect();
  const client = await g._mcpMongo;
  return client.db(process.env.MONGODB_DB || undefined); // db name from URI if not set
}

function col(db: Db, name: string) {
  if (BLOCKED.has(name.toLowerCase())) throw new Error(`Collection "${name}" is blocked.`);
  return db.collection(name);
}

// Turn {"_id":"abc..."} strings into ObjectIds, and given fields into ObjectId / Date.
function toId(v: unknown) {
  return typeof v === "string" && ObjectId.isValid(v) && v.length === 24 ? new ObjectId(v) : v;
}
function prepare(
  data: Record<string, unknown>,
  objectIdFields: string[] = [],
  dateFields: string[] = []
) {
  const out: Record<string, unknown> = { ...data };
  for (const f of ["_id", ...objectIdFields]) {
    if (f in out) out[f] = Array.isArray(out[f]) ? (out[f] as unknown[]).map(toId) : toId(out[f]);
  }
  for (const f of dateFields) if (typeof out[f] === "string") out[f] = new Date(out[f] as string);
  return out;
}
function idFilter(idOrSlug: string): Record<string, unknown> {
  return ObjectId.isValid(idOrSlug) && idOrSlug.length === 24
    ? { _id: new ObjectId(idOrSlug) }
    : { slug: idOrSlug };
}

const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});
const fail = (e: unknown) => ({
  isError: true,
  content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
});

// Refresh public pages so changes show immediately.
function refresh(paths: string[] = []) {
  for (const p of ["/", "/polls", "/blogs", ...paths]) {
    try { revalidatePath(p); } catch { /* ignore */ }
  }
}

const jsonObj = z.record(z.string(), z.any());

// ---------- MCP tools ----------
const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "describe_schema",
      {
        title: "Describe database",
        description:
          "List all MongoDB collections with document counts and one sample document each (long text trimmed). Call this first to learn how polls, options, votes and blogs are stored.",
        inputSchema: z.object({}),
      },
      async () => {
        try {
          const db = await getDb();
          const cols = await db.listCollections().toArray();
          const result = [];
          for (const c of cols) {
            if (BLOCKED.has(c.name.toLowerCase())) { result.push({ name: c.name, blocked: true }); continue; }
            const coll = db.collection(c.name);
            const [count, sample] = await Promise.all([
              coll.estimatedDocumentCount(),
              coll.find().sort({ _id: -1 }).limit(1).next(),
            ]);
            const trimmed = sample
              ? JSON.parse(JSON.stringify(sample, (_k, v) => (typeof v === "string" && v.length > 200 ? v.slice(0, 200) + "…" : v)))
              : null;
            result.push({ name: c.name, count, sample: trimmed });
          }
          return ok(result);
        } catch (e) { return fail(e); }
      }
    );

    server.registerTool(
      "list_documents",
      {
        title: "List documents",
        description: "List documents in a collection (e.g. polls, blogs, votes) with optional filter, sort, field projection and paging.",
        inputSchema: z.object({
          collection: z.string(),
          filter: jsonObj.optional().describe('MongoDB filter, e.g. {"status":"open"}'),
          sort: z.record(z.string(), z.union([z.literal(1), z.literal(-1)])).optional().describe('e.g. {"createdAt":-1}'),
          fields: z.array(z.string()).optional().describe("Only return these fields"),
          limit: z.number().int().min(1).max(200).default(20),
          skip: z.number().int().min(0).default(0),
        }),
      },
      async ({ collection, filter, sort, fields, limit, skip }) => {
        try {
          const db = await getDb();
          const projection = fields?.length ? Object.fromEntries(fields.map((f) => [f, 1])) : undefined;
          const c = col(db, collection);
          const q = prepare(filter ?? {});
          const [docs, total] = await Promise.all([
            c.find(q, { projection }).sort(sort ?? { _id: -1 }).skip(skip).limit(limit).toArray(),
            c.countDocuments(q),
          ]);
          return ok({ total, returned: docs.length, docs });
        } catch (e) { return fail(e); }
      }
    );

    server.registerTool(
      "get_document",
      {
        title: "Get document",
        description: "Get one document by _id or slug.",
        inputSchema: z.object({ collection: z.string(), id_or_slug: z.string() }),
      },
      async ({ collection, id_or_slug }) => {
        try {
          const db = await getDb();
          const doc = await col(db, collection).findOne(idFilter(id_or_slug));
          return doc ? ok(doc) : fail("Not found");
        } catch (e) { return fail(e); }
      }
    );

    server.registerTool(
      "create_document",
      {
        title: "Create document",
        description:
          "Insert a new document (e.g. a new poll or blog). Match the field names from describe_schema exactly. createdAt/updatedAt are added if missing.",
        inputSchema: z.object({
          collection: z.string(),
          data: jsonObj,
          object_id_fields: z.array(z.string()).optional().describe("Fields whose string values are ObjectId references"),
          date_fields: z.array(z.string()).optional().describe("Fields whose string values are dates"),
        }),
      },
      async ({ collection, data, object_id_fields, date_fields }) => {
        try {
          const db = await getDb();
          const now = new Date();
          const doc: Record<string, unknown> = { createdAt: now, updatedAt: now, ...prepare(data, object_id_fields, date_fields) };
          const r = await col(db, collection).insertOne(doc);
          refresh(typeof doc.slug === "string" ? [`/${collection}/${doc.slug}`] : []);
          return ok({ insertedId: r.insertedId, doc });
        } catch (e) { return fail(e); }
      }
    );

    server.registerTool(
      "update_document",
      {
        title: "Update document",
        description: "Update fields of one document (by _id or slug). Only the given fields change. Use unset to remove fields.",
        inputSchema: z.object({
          collection: z.string(),
          id_or_slug: z.string(),
          set: jsonObj.optional(),
          unset: z.array(z.string()).optional(),
          object_id_fields: z.array(z.string()).optional(),
          date_fields: z.array(z.string()).optional(),
        }),
      },
      async ({ collection, id_or_slug, set, unset, object_id_fields, date_fields }) => {
        try {
          const db = await getDb();
          const update: Record<string, unknown> = {
            $set: { ...prepare(set ?? {}, object_id_fields, date_fields), updatedAt: new Date() },
          };
          if (unset?.length) update.$unset = Object.fromEntries(unset.map((f) => [f, ""]));
          const doc = await col(db, collection).findOneAndUpdate(idFilter(id_or_slug), update, { returnDocument: "after" });
          if (!doc) return fail("Not found");
          refresh(typeof doc.slug === "string" ? [`/${collection}/${doc.slug}`] : []);
          return ok(doc);
        } catch (e) { return fail(e); }
      }
    );

    server.registerTool(
      "delete_document",
      {
        title: "Delete document",
        description: "Permanently delete one document by _id or slug. Requires confirm=true. Ask the site owner before using.",
        inputSchema: z.object({ collection: z.string(), id_or_slug: z.string(), confirm: z.literal(true) }),
      },
      async ({ collection, id_or_slug }) => {
        try {
          const db = await getDb();
          const doc = await col(db, collection).findOneAndDelete(idFilter(id_or_slug));
          if (!doc) return fail("Not found");
          refresh(typeof doc.slug === "string" ? [`/${collection}/${doc.slug}`] : []);
          return ok({ deleted: doc._id, slug: doc.slug ?? null });
        } catch (e) { return fail(e); }
      }
    );

    server.registerTool(
      "aggregate",
      {
        title: "Aggregate (read-only stats)",
        description: "Run a read-only MongoDB aggregation pipeline, e.g. count votes per option. $out and $merge are not allowed.",
        inputSchema: z.object({ collection: z.string(), pipeline: z.array(jsonObj) }),
      },
      async ({ collection, pipeline }) => {
        try {
          if (JSON.stringify(pipeline).match(/"\$(out|merge)"/)) throw new Error("$out/$merge not allowed");
          const db = await getDb();
          const rows = await col(db, collection).aggregate(pipeline.map((s) => prepare(s))).limit(500).toArray();
          return ok(rows);
        } catch (e) { return fail(e); }
      }
    );

    server.registerTool(
      "upload_image",
      {
        title: "Upload image",
        description: "Upload an image to Cloudinary from a public URL (or base64 data URI). Returns the secure_url to save in a poll/blog.",
        inputSchema: z.object({
          source: z.string().describe("Image URL or data:image/...;base64,..."),
          folder: z.string().default("pulse/polls"),
        }),
      },
      async ({ source, folder }) => {
        try {
          const r = await cloudinary.uploader.upload(source, { folder, resource_type: "image" });
          return ok({ secure_url: r.secure_url, public_id: r.public_id, width: r.width, height: r.height });
        } catch (e) { return fail(e); }
      }
    );

    server.registerTool(
      "refresh_pages",
      {
        title: "Refresh pages",
        description: "Clear Next.js cache for given paths so changes show on the live site.",
        inputSchema: z.object({ paths: z.array(z.string()).default([]) }),
      },
      async ({ paths }) => { refresh(paths); return ok({ refreshed: ["/", "/polls", "/blogs", ...paths] }); }
    );
  },
  { serverInfo: { name: "saynow", version: "1.0.0" } }
);

// ---------- secret-key check ----------
async function guarded(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!MCP_SECRET || key !== MCP_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  return handler(req);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
