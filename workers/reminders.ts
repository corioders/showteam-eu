const worker = {
  async scheduled(_controller: ScheduledController, env: { CRON_SECRET: string }): Promise<void> {
    const response = await fetch("https://www.showteam.eu/api/internal/reminders", { method: "POST", headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
    if (!response.ok) throw new Error(`SHOWteam reminders returned ${response.status}`);
  },
};

export default worker;
