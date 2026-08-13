import Link from "next/link";

export function QuickUploadCard() {
  return (
    <div>
      <div className="quick-upload-card"><div><strong>Kalendarz rezerwacji</strong><p>Dzisiejszy grafik, telefony klientów i ekran bazy.</p></div><Link href="/admin/kalendarz">Otwórz kalendarz</Link></div>
      <div className="quick-upload-card"><div><strong>Co wynajmujemy?</strong><p>Dodaj lub zmień sprzęt tylko tutaj — strona, terminy i kalendarz pobiorą te same dane automatycznie.</p></div><Link href="/admin/collections/equipment">Zarządzaj sprzętem</Link></div>
      <div className="quick-upload-card">
        <div><strong>Szybkie dodawanie</strong><p>Wrzuć zdjęcia lub filmy z telefonu bez wypełniania całego formularza.</p></div>
        <Link href="/dodaj">Otwórz uploader</Link>
      </div>
    </div>
  );
}
