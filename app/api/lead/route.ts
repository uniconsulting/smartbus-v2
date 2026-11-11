import { NextResponse } from "next/server";
import { readPublicJson, rateLimitedResponse } from "@/lib/public-request";
import { trustedClientIp } from "@/lib/client-ip";
import { randomUUID } from "node:crypto";
import { contactHint, contactKind } from "@/lib/lead-contact";
import { isId, readVisit } from "@/lib/analytics-contract";
import { acceptLead, type AcceptedLead } from "@/lib/analytics-store";
import { deliverLead } from "@/lib/integrations-delivery";
import { consentArchiveStatement, getConsentSnapshot } from "@/lib/consent-snapshot";

export const runtime = "nodejs";
function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
const invalid = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function GET() {
  const current = await getConsentSnapshot();
  return NextResponse.json({ consentRevision: current?.revision ?? null }, {
    status: current ? 200 : 503, headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const input = await readPublicJson(request, 16 * 1024);
  if (input.response) return input.response;
  const body = input.body;
  if (clean(body.company, 200)) return NextResponse.json({ ok: true });
  if (body.consent !== true) return invalid("Подтвердите согласие на обработку данных");

  const contact = typeof body.contact === "string" ? body.contact.trim() : "";
  const kind = contactKind(contact);
  if ("contact" in body && !kind) return invalid(contactHint);
  const name = clean(body.name, 100),
    phone = kind === "phone" ? contact : clean(body.phone, 40);
  if (!kind && (!name || contactKind(phone) !== "phone"))
    return invalid("Укажите имя, телефон и согласие на обработку данных");
  if (body.requestId !== undefined && !isId(body.requestId)) return invalid("Некорректный номер заявки");
  const id = body.requestId ?? randomUUID();
  try {
    const consent = await getConsentSnapshot();
    if (!consent) {
      return NextResponse.json(
        { error: "Форма временно недоступна. Позвоните нам, пожалуйста." },
        { status: 503 },
      );
    }
    if (body.consentRevision !== consent.revision) {
      return NextResponse.json({
        error: "Условия обработки данных обновились. Ознакомьтесь с ними и подтвердите согласие ещё раз.",
        consentRevision: consent.revision,
      }, { status: 409 });
    }
    const lead: AcceptedLead = {
      name,
      phone,
      ...(kind && { contact }),
      task: clean(body.task, 1000),
      route: clean(body.route, 300),
      passengers: clean(body.passengers, 30),
      consent: true,
      consentDocument: consent.label,
      consentRevision: consent.revision,
      createdAt: new Date().toISOString(),
    };
    const visit = body.analyticsConsent === true ? readVisit(body.visit) : null;
    const acceptance = await acceptLead(id, lead, visit, trustedClientIp(request.headers), consentArchiveStatement(consent, id));
    if (acceptance.status === "limited") return rateLimitedResponse(acceptance.retryAfter);
    if (acceptance.status === "accepted") {
      // Acceptance is durable. Delivery can be retried from the integrations screen.
      try {
        await deliverLead(id);
      } catch {
        /* A pending receipt remains available for retry. */
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить заявку. Попробуйте ещё раз." }, { status: 503 });
  }
}
