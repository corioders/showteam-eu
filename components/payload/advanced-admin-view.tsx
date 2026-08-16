import Link from "next/link";

const groups = [
  { title: "Strona", links: [{ href: "/admin/collections/offers", label: "Oferty" }, { href: "/admin/collections/gallery", label: "Galeria" }] },
  { title: "Rezerwacje", links: [{ href: "/admin/collections/equipment", label: "Aktywności" }, { href: "/admin/collections/bookings", label: "Rezerwacje aktywności" }, { href: "/admin/collections/stay-bookings", label: "Noclegi" }] },
  { title: "Uczestnicy", links: [{ href: "/admin/collections/applications", label: "Wszystkie zgłoszenia" }, { href: "/admin/collections/event-inquiries", label: "Imprezy i spływy" }] },
] as const;

export function AdvancedAdminView() {
  return <main className="advanced-admin"><span>TRYB AWARYJNY</span><h1>Zaawansowane</h1><p>Większość zmian zrobisz prościej bezpośrednio na stronie. Tutaj wejdź tylko wtedy, gdy potrzebujesz pełnej listy danych.</p><Link href="/" className="advanced-admin__back">← Wróć do edycji strony</Link><div>{groups.map((group) => <section key={group.title}><h2>{group.title}</h2>{group.links.map((link) => <Link key={link.href} href={link.href}>{link.label} →</Link>)}</section>)}</div></main>;
}
