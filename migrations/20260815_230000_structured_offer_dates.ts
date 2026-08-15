import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE offers_dates_new (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id text PRIMARY KEY NOT NULL,
    label text,
    date text,
    start_date text,
    end_date text,
    FOREIGN KEY (_parent_id) REFERENCES offers(id) ON UPDATE no action ON DELETE cascade
  );`);
  await db.run(sql`INSERT INTO offers_dates_new (_order, _parent_id, id, label, date)
    SELECT _order, _parent_id, id, label, date FROM offers_dates;`);
  await db.run(sql`DROP TABLE offers_dates;`);
  await db.run(sql`ALTER TABLE offers_dates_new RENAME TO offers_dates;`);
  await db.run(sql`CREATE INDEX offers_dates_order_idx ON offers_dates (_order);`);
  await db.run(sql`CREATE INDEX offers_dates_parent_id_idx ON offers_dates (_parent_id);`);

  await db.run(sql`UPDATE offers_dates SET
    start_date = CASE date
      WHEN '28.06–10.07' THEN '2026-06-28' WHEN '28 czerwca – 10 lipca' THEN '2026-06-28'
      WHEN '12–24.07' THEN '2026-07-12' WHEN '12–24 lipca' THEN '2026-07-12'
      WHEN '26.07–7.08' THEN '2026-07-26' WHEN '26 lipca – 7 sierpnia' THEN '2026-07-26'
      WHEN '9–15.08' THEN '2026-08-09' WHEN '9–15 sierpnia' THEN '2026-08-09'
      WHEN '15–21.08' THEN '2026-08-15' WHEN '15–21 sierpnia' THEN '2026-08-15'
      WHEN '21–27.12' THEN '2025-12-21' WHEN '21–27 grudnia · Boże Narodzenie' THEN '2025-12-21'
      WHEN '27.12–2.01' THEN '2025-12-27' WHEN '27 grudnia–2 stycznia · San Silvestro' THEN '2025-12-27'
      WHEN '3–10.01' THEN '2026-01-03' WHEN '3–10 stycznia' THEN '2026-01-03'
      WHEN '17–24.01' THEN '2026-01-17' WHEN '17–24 stycznia' THEN '2026-01-17'
      WHEN '24–31.01' THEN '2026-01-24' WHEN '24–31 stycznia' THEN '2026-01-24'
      WHEN '31.01–7.02' THEN '2026-01-31' WHEN '31 stycznia–7 lutego' THEN '2026-01-31'
      WHEN '7–14.02' THEN '2026-02-07' WHEN '7–14 lutego' THEN '2026-02-07'
      WHEN '14–21.02' THEN '2026-02-14' WHEN '14–21 lutego' THEN '2026-02-14'
      WHEN '21–28.02' THEN '2026-02-21' WHEN '21–28 lutego' THEN '2026-02-21'
      WHEN '28.02–7.03' THEN '2026-02-28' WHEN '28 lutego–7 marca' THEN '2026-02-28'
    END,
    end_date = CASE date
      WHEN '28.06–10.07' THEN '2026-07-10' WHEN '28 czerwca – 10 lipca' THEN '2026-07-10'
      WHEN '12–24.07' THEN '2026-07-24' WHEN '12–24 lipca' THEN '2026-07-24'
      WHEN '26.07–7.08' THEN '2026-08-07' WHEN '26 lipca – 7 sierpnia' THEN '2026-08-07'
      WHEN '9–15.08' THEN '2026-08-15' WHEN '9–15 sierpnia' THEN '2026-08-15'
      WHEN '15–21.08' THEN '2026-08-21' WHEN '15–21 sierpnia' THEN '2026-08-21'
      WHEN '21–27.12' THEN '2025-12-27' WHEN '21–27 grudnia · Boże Narodzenie' THEN '2025-12-27'
      WHEN '27.12–2.01' THEN '2026-01-02' WHEN '27 grudnia–2 stycznia · San Silvestro' THEN '2026-01-02'
      WHEN '3–10.01' THEN '2026-01-10' WHEN '3–10 stycznia' THEN '2026-01-10'
      WHEN '17–24.01' THEN '2026-01-24' WHEN '17–24 stycznia' THEN '2026-01-24'
      WHEN '24–31.01' THEN '2026-01-31' WHEN '24–31 stycznia' THEN '2026-01-31'
      WHEN '31.01–7.02' THEN '2026-02-07' WHEN '31 stycznia–7 lutego' THEN '2026-02-07'
      WHEN '7–14.02' THEN '2026-02-14' WHEN '7–14 lutego' THEN '2026-02-14'
      WHEN '14–21.02' THEN '2026-02-21' WHEN '14–21 lutego' THEN '2026-02-21'
      WHEN '21–28.02' THEN '2026-02-28' WHEN '21–28 lutego' THEN '2026-02-28'
      WHEN '28.02–7.03' THEN '2026-03-07' WHEN '28 lutego–7 marca' THEN '2026-03-07'
    END,
    label = COALESCE(NULLIF(label, ''), CASE date
      WHEN '21–27.12' THEN 'Boże Narodzenie' WHEN '21–27 grudnia · Boże Narodzenie' THEN 'Boże Narodzenie'
      WHEN '27.12–2.01' THEN 'San Silvestro' WHEN '27 grudnia–2 stycznia · San Silvestro' THEN 'San Silvestro'
      ELSE date
    END);`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`CREATE TABLE offers_dates_old (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id text PRIMARY KEY NOT NULL,
    label text,
    date text NOT NULL,
    FOREIGN KEY (_parent_id) REFERENCES offers(id) ON UPDATE no action ON DELETE cascade
  );`);
  await db.run(sql`INSERT INTO offers_dates_old (_order, _parent_id, id, label, date)
    SELECT _order, _parent_id, id, label, COALESCE(date, start_date || ' – ' || end_date) FROM offers_dates;`);
  await db.run(sql`DROP TABLE offers_dates;`);
  await db.run(sql`ALTER TABLE offers_dates_old RENAME TO offers_dates;`);
  await db.run(sql`CREATE INDEX offers_dates_order_idx ON offers_dates (_order);`);
  await db.run(sql`CREATE INDEX offers_dates_parent_id_idx ON offers_dates (_parent_id);`);
}
