# SHOWteam — kolejka prac

Aktualizuj ten plik po każdym ukończonym kroku. Nie zamykaj zadania bez testu, commita i pushu.

## W toku

- [x] Naprawić mobilny nagłówek Payload na wszystkich ekranach edycji: tylko menu i logo, bez uciętych breadcrumbs/konta.
- [x] Wydarzenia: zdjęcie obowiązkowe, brak zdjęcia domyślnego i brak publikacji rekordów bez zdjęcia.
- [x] Własny prosty formularz „Dodaj wydarzenie”: jeden ekran, polskie etykiety, błędy przy polach, scroll do pierwszego błędu, zdjęcie obowiązkowe.
- [ ] Zamienić pozostałe szybkie akcje na własne proste ekrany: wydarzenia, wynajem/sprzęt, oferta. Galeria, kalendarz, statystyki i TV już mają własne ekrany.
- [ ] Zostawić pełny Payload CMS jako drugorzędne „Zaawansowane”, dostępne z panelu awaryjnie.
- [ ] Tryb redakcyjny strony: po zalogowaniu do `/admin` pokazać niewielkie przyciski „Edytuj” prowadzące do właściwego ekranu dla oferty, wydarzeń, galerii i wynajmu.
- [ ] Ekrany otwierane przez „Edytuj”: live preview jest gotowy dla wydarzeń; dodać go przy własnych formularzach oferty, galerii i wynajmu, kiedy powstaną.
- [x] Dodać widoczny przycisk „Wyczyść formularz” do własnych formularzy i formularzy Payload; musi usuwać także lokalnie zapisany draft.
- [x] Formularz zgłoszeniowy wzorowany na obecnym SHOWteam: zapis do bazy, prosty ekran administracyjny i eksport do Excela. E-mail pozostaje wyłączony do późniejszej konfiguracji.
- [ ] Po otrzymaniu docelowego formatu eksportu zmienić układ kolumn zgłoszeń; zapisane dane i formularz pozostają bez zmian.

## Do weryfikacji po deployu

- [ ] Safari/iPhone: `/admin/kalendarz` zawsze startuje jako lista; brak widoku tygodnia i zagnieżdżonego scrolla.
- [ ] Safari/iPhone: CMS header nie nachodzi na tytuł formularza.
- [ ] Blokady wynajmu: cały dzień domyślnie, opcjonalne własne godziny, wszystkie albo jeden sprzęt.
- [ ] Statystyki używają etykiety „Odwiedziny strony”.
- [ ] Oficjalny TikTok prowadzi do `https://www.tiktok.com/@showteam1969`.

## Ukończone

- [x] Client-side navigation i prefetch w navbarze.
- [x] OpenNext ISR: R2 cache bez timera, unieważnianie po zmianach CMS przez D1 tag cache.
- [x] Mobilny selektor dat rezerwacji.
- [x] Usunięty iframe kalendarza CMS.
- [x] Dodane blokowanie wynajmu i reguły godzinowe.
- [x] CMS jest jedynym instalowalnym PWA.
