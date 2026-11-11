import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import LoginForm from "./LoginForm";

export default async function AdminLogin() {
  if (await currentAdmin()) redirect("/adpanel");
  return <main className="admin-ui admin-entry">
    <section className="admin-login" aria-labelledby="entry-title">
      <div className="admin-login-band"><Link href="/" aria-label="SmartBus — на главную"><img src="/home/brand/logo.svg" width="166" height="42" alt="SmartBus" /></Link><span>Управление сайтом</span></div>
      <div className="admin-login-fields"><h1 id="entry-title">Вход в панель</h1><LoginForm /></div>
    </section>
  </main>;
}
