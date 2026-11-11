import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import AdminNav, { AdminToolbar } from "./AdminNav";

export default async function Panel({ children }: { children: React.ReactNode }) {
  const login = await currentAdmin();
  if (!login) redirect("/adpanel/login");
  return <div className="admin-ui admin-shell">
    <a className="admin-skip" href="#admin-content">К содержимому</a>
    <AdminNav login={login} />
    <div className="admin-work"><AdminToolbar/>
      <main className="admin-main" id="admin-content" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
