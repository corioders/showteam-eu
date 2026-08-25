"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";

export function LogoutButton() {
	return (
		<Link href="/admin/logout" prefetch={false} className="showteam-admin-logout" aria-label="Wyloguj się">
			<LogOut aria-hidden="true" />
			<span>Wyloguj się</span>
		</Link>
	);
}
