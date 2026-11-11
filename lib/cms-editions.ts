import "server-only";
import { randomUUID } from "node:crypto";
import { readRecord, writeRecord } from "./admin-store";

export class EditorialError extends Error {}

export function editorMessage(error: unknown, fallback: string) {
  if (error instanceof EditorialError) return error.message;
  if (error instanceof Error && error.message.startsWith("Другой редактор уже изменил эти данные")) return error.message;
  return fallback;
}

export type Edition<T> = { id: string; draft: T; published: T | null };
export type EditionMode = "save" | "publish" | "unpublish" | "remove" | "up" | "down";
export type EditorResult = { ok: true; id: string; revision: number } | { ok: false; error: string };

export function text(value: unknown, label: string, max: number, required = false) {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) {
    throw new EditorialError(`Проверьте поле «${label}». Максимум ${max} символов.`);
  }
  return value.trim();
}

export function slug(value: unknown) {
  if (typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 100 || value === "new") {
    throw new EditorialError("Укажите адрес до 100 символов из строчных латинских букв, цифр и дефисов.");
  }
  return value;
}

export function lines(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length > 200) throw new EditorialError(`Проверьте список «${label}».`);
  return value.map(v => text(v, label, 12000)).filter(Boolean);
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new EditorialError("Некорректные данные редактора.");
  return value as Record<string, unknown>;
}

export async function changeEdition<T>(
  key: string, defaults: Edition<T>[], id: string | null, expected: number, mode: EditionMode,
  readDraft: (current: Edition<T> | undefined, all: Edition<T>[]) => T | Promise<T>,
  afterCommit?: (previous: Edition<T>, editions: Edition<T>[]) => Promise<void>,
) {
  if (!["save","publish","unpublish","remove","up","down"].includes(mode)) throw new EditorialError("Неизвестное действие.");
  const { value: all, revision } = await readRecord(key, defaults);
  if (revision !== expected) throw new EditorialError("Список изменился в другой вкладке. Обновите страницу перед сохранением.");
  const index = all.findIndex(item => item.id === id);
  const current = all[index];
  if (id !== null && !current) throw new EditorialError("Материал не найден. Обновите список.");
  if (!current && mode !== "save" && mode !== "publish") throw new EditorialError("Сначала сохраните материал.");
  const next = [...all];
  const resultId = current?.id ?? randomUUID();
  if (mode === "save" || mode === "publish") {
    const draft = await readDraft(current, all);
    const edition = { id: resultId, draft, published: mode === "publish" ? draft : current?.published ?? null };
    if (current) next[index] = edition;
    else next.push(edition);
  } else if (mode === "unpublish") {
    next[index] = { ...current, published: null };
  } else if (mode === "remove") {
    if (current.published) throw new EditorialError("Сначала снимите материал с публикации.");
    next.splice(index, 1);
  } else {
    const target = index + (mode === "up" ? -1 : 1);
    if (target < 0 || target >= next.length) throw new EditorialError("Материал уже находится на краю списка.");
    [next[index], next[target]] = [next[target], next[index]];
  }
  const nextRevision = await writeRecord(key, next, expected);
  if (current && afterCommit) await afterCommit(current, next);
  return { id: resultId, revision: nextRevision };
}
