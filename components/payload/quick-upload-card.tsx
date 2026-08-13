import Link from "next/link";

export function QuickUploadCard() {
  return (
    <div className="quick-upload-card">
      <div>
        <strong>Szybkie dodawanie</strong>
        <p>Wrzuć zdjęcia lub filmy z telefonu bez wypełniania całego formularza.</p>
      </div>
      <Link href="/dodaj">Otwórz uploader</Link>
    </div>
  );
}
