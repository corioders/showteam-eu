"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return <Link href="/a/admin/logout" prefetch={false} className="showteam-admin-logout" aria-label="Wyloguj się"><LogOut aria-hidden="true" /><span>Wyloguj się</span></Link>;
}
