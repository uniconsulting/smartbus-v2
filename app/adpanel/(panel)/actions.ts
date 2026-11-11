"use server";
import { redirect } from "next/navigation";
import { endAdminSession } from "@/lib/admin-auth";
export async function signOut() { await endAdminSession(); redirect("/adpanel/login"); }
