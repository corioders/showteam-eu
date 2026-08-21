import { isLoggedIn } from "cstd-ts/firebase/auth.js";
import type { FirebaseApp } from "firebase/app";
import { redirect, usePathname } from "next/navigation";
import { useEffect } from "react";

// TODO: Make this hook "redirect nicer". Now we just jumo from the login page to the home page.
export function useLoggedInRedirect(firebaseApp: FirebaseApp, loginPath: string, loggedInPath: string): void {
	const currentPath = usePathname();
	useEffect(() => {
		(async () => {
			const loggedIn = await isLoggedIn(firebaseApp);
			if (!loggedIn && currentPath !== loginPath) {
				redirect(loginPath);
			}

			if (loggedIn && currentPath === loginPath) {
				redirect(loggedInPath);
			}
		})();
	}, [currentPath, firebaseApp, loginPath, loggedInPath]);
}
