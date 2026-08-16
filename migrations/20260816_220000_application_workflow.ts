import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`UPDATE applications SET status = CASE
    WHEN status IN ('accepted', 'completed') THEN 'confirmed'
    WHEN status = 'no_show' THEN 'rejected'
    ELSE status END;`);
  await db.run(sql`ALTER TABLE applications ADD invoice_requested integer DEFAULT false;`);
  await db.run(sql`ALTER TABLE applications ADD invoice_company text;`);
  await db.run(sql`ALTER TABLE applications ADD invoice_nip text;`);
  await db.run(sql`ALTER TABLE applications ADD invoice_street text;`);
  await db.run(sql`ALTER TABLE applications ADD invoice_postal_code text;`);
  await db.run(sql`ALTER TABLE applications ADD invoice_city text;`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`UPDATE applications SET status = CASE WHEN status = 'confirmed' THEN 'accepted' WHEN status = 'rejected' THEN 'no_show' ELSE status END;`);
  await db.run(sql`ALTER TABLE applications DROP COLUMN invoice_requested;`);
  await db.run(sql`ALTER TABLE applications DROP COLUMN invoice_company;`);
  await db.run(sql`ALTER TABLE applications DROP COLUMN invoice_nip;`);
  await db.run(sql`ALTER TABLE applications DROP COLUMN invoice_street;`);
  await db.run(sql`ALTER TABLE applications DROP COLUMN invoice_postal_code;`);
  await db.run(sql`ALTER TABLE applications DROP COLUMN invoice_city;`);
}
