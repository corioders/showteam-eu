import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";

type SubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string };

export async function notifyStaff(database: D1Database, notification: { title: string; body: string; url: string }): Promise<void> {
	const publicKey = process.env.VAPID_PUBLIC_KEY;
	const privateKey = process.env.VAPID_PRIVATE_KEY;
	if (!publicKey || !privateKey) {
		return;
	}
	let subscriptions;
	try {
		subscriptions = await database
			.prepare(`SELECT subscriptions.id, subscriptions.endpoint, subscriptions.p256dh, subscriptions.auth
      FROM push_subscriptions subscriptions JOIN users ON users.id = subscriptions.user_id
      WHERE users.receives_notifications = true`)
			.all<SubscriptionRow>();
	} catch (_error) {
		return;
	}
	await Promise.allSettled(
		subscriptions.results.map(async (row) => {
			const subscription: PushSubscription = { endpoint: row.endpoint, expirationTime: null, keys: { p256dh: row.p256dh, auth: row.auth } };
			try {
				const payload = await buildPushPayload({ data: JSON.stringify(notification), options: { ttl: 3600, urgency: "high" } }, subscription, {
					subject: "mailto:biuro@showteam.eu",
					publicKey,
					privateKey,
				});
				const response = await fetch(subscription.endpoint, { ...payload, body: Uint8Array.from(payload.body).buffer });
				if (response.status === 404 || response.status === 410) {
					await database.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(row.id).run();
				} else if (!response.ok) {
					throw new Error(`Push endpoint returned ${response.status}`);
				}
			} catch (_error) {}
		}),
	);
}
