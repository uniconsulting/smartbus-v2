import "server-only";
import { createHash } from "node:crypto";
import { readDocumentEditions } from "./cms-documents";

export async function getConsentSnapshot() {
  const { value } = await readDocumentEditions();
  const documents = ["privacy", "consent"].map(slug => {
    const published = value.find(entry => entry.published?.slug === slug)?.published;
    if (published?.kind !== "legal" || !published.legal?.updated) return null;
    return { slug, title: published.title, legal: published.legal };
  });
  const [privacy, consent] = documents;
  if (!privacy || !consent) return null;
  const content = JSON.stringify({ privacy, consent });
  return { revision: createHash("sha256").update(content).digest("hex"), label: consent.legal.updated, content };
}

export function consentArchiveStatement(snapshot: NonNullable<Awaited<ReturnType<typeof getConsentSnapshot>>>, leadId: string) {
  return {
    sql: "INSERT INTO records(key,value,revision) SELECT ?,?,1 WHERE NOT EXISTS (SELECT 1 FROM lead_requests WHERE id=?) ON CONFLICT(key) DO NOTHING",
    args: ["accepted-terms:" + snapshot.revision, snapshot.content, leadId],
  };
}
