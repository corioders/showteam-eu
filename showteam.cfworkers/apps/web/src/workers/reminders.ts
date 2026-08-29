// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
const worker = {
	async scheduled(_controller: ScheduledController, env: { CRON_SECRET: string }): Promise<void> {
		const response = await fetch("https://www.showteam.eu/api/internal/reminders", { method: "POST", headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
		if (!response.ok) {
			throw new Error(`SHOWteam reminders returned ${response.status}`);
		}
	},
};

export default worker;
