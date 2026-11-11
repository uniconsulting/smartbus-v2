"use client";
import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginForm() {
  const [error, action, pending] = useActionState(signIn, "");
  return <form action={action} className="admin-form">
    <label className="admin-field">Логин<input name="login" required autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={100} /></label>
    <label className="admin-field">Пароль<input name="password" type="password" required autoComplete="current-password" maxLength={1024} /></label>
    {error && <p role="alert" className="admin-notice">{error}</p>}
    <button className="admin-primary" disabled={pending}>{pending ? "Входим…" : "Войти"}</button>
  </form>;
}
