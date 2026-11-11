"use server";
import { redirect } from "next/navigation";
import { loginAdmin } from "@/lib/admin-auth";

export async function signIn(_: string, fields: FormData): Promise<string> {
  const login = String(fields.get("login") ?? "").trim().toLowerCase();
  const status = await loginAdmin(login, String(fields.get("password") ?? ""));
  if (status === "limited") return "Слишком много попыток. Подождите немного и повторите вход.";
  if (status === "invalid") return "Проверьте логин и пароль.";
  redirect("/adpanel");
}
