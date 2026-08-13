import Link from "next/link";

const tasks = [
  { href: "/admin/collections/events/create", title: "Dodaj wydarzenie", description: "Termin, miejsce, opis i zdjęcie." },
  { href: "/dodaj", title: "Dodaj zdjęcia lub filmy", description: "Najprostszy uploader prosto z telefonu." },
  { href: "/admin/kalendarz", title: "Sprawdź rezerwacje", description: "Kalendarz bazy, telefony i notatki." },
  { href: "/admin/collections/equipment", title: "Zmień wynajem", description: "Sprzęt, liczba sztuk i godziny." },
  { href: "/admin/collections/offers", title: "Edytuj ofertę", description: "Lato, zima i szkolenia na stronie." },
  { href: "/admin/collections/analytics", title: "Zobacz statystyki", description: "Odwiedziny strony z ostatnich 30 dni." },
  { href: "/admin/telewizory", title: "Połączone telewizory", description: "Stały dostęp ekranu bazy i jego odłączanie." },
];

export function QuickUploadCard() {
  return (
    <section className="admin-start">
      <div className="admin-start__heading">
        <span>Panel SHOWteam</span>
        <h1>Co chcesz zrobić?</h1>
        <p>Wybierz zadanie. Resztę panel przeprowadzi krok po kroku.</p>
      </div>
      <div className="admin-task-grid">
        {tasks.map((task, index) => <Link href={task.href} className="admin-task" key={task.href}>
          <span className="admin-task__number">{String(index + 1).padStart(2, "0")}</span>
          <strong>{task.title}</strong>
          <p>{task.description}</p>
          <span className="admin-task__action">Otwórz →</span>
        </Link>)}
      </div>
    </section>
  );
}
