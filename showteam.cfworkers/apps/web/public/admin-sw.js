self.addEventListener("push", (event) => {
	let notification = { title: "SHOWteam", body: "Masz nową sprawę w panelu.", url: "/admin" };
	try {
		notification = { ...notification, ...JSON.parse(event.data?.text() || "{}") };
	} catch {}
	event.waitUntil(
		self.registration.showNotification(notification.title, {
			body: notification.body,
			icon: "/pwa-192.png",
			badge: "/pwa-192.png",
			data: { url: notification.url },
			tag: notification.url,
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	event.waitUntil(
		clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
			const target = new URL(event.notification.data?.url || "/admin", self.location.origin).href;
			const open = windows.find((window) => window.url === target);
			return open ? open.focus() : clients.openWindow(target);
		}),
	);
});
