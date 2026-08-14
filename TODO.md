# SHOWteam — kolejka prac

Aktualizuj ten plik po każdym ukończonym kroku. Nie zamykaj zadania bez testu, commita i pushu.

## W toku

- [ ] Ułatwić publiczne zgłoszenia uczestników:
  - [x] Pracować w osobnym worktree na branchu `feat/application-form-visibility`.
  - [x] Pokazać wyraźny link „Zgłoszenie” w nagłówku i menu mobilnym.
  - [x] Najpierw wybierać Lato, Zima albo Szkolenia, a dopiero później termin.
  - [x] Nie pokazywać terminów, które już się zakończyły; trwający termin pozostaje dostępny do ostatniego dnia.
  - [x] Pokazywać transport autokarem tylko dla Zimy; po zmianie kategorii czyścić odpowiedź.
  - [x] Nadal zapisywać pełną datę urodzenia, a na ekranie zgłoszeń pokazywać też aktualny wiek.
  - [x] Sprawdzić wygląd formularza na telefonie i desktopie.
  - [x] Uruchomić końcowy build i testy.
  - [x] Zrobić commit i push brancha.
  - [ ] Przed jakimkolwiek merge’em pokazać użytkownikowi efekt i poczekać na zgodę; nie robić preview deployu.
- [x] Naprawić mobilny nagłówek Payload na wszystkich ekranach edycji: tylko menu i logo, bez uciętych breadcrumbs/konta.
- [x] Wydarzenia: zdjęcie obowiązkowe, brak zdjęcia domyślnego i brak publikacji rekordów bez zdjęcia.
- [x] Własny prosty formularz „Dodaj wydarzenie”: jeden ekran, polskie etykiety, błędy przy polach, scroll do pierwszego błędu, zdjęcie obowiązkowe.
- [ ] Zamienić pozostałe szybkie akcje na własne proste ekrany: wydarzenia, wynajem/sprzęt, oferta. Galeria, kalendarz, statystyki i TV już mają własne ekrany.
- [ ] Zostawić pełny Payload CMS jako drugorzędne „Zaawansowane”, dostępne z panelu awaryjnie.
- [ ] Tryb redakcyjny strony: po zalogowaniu do `/admin` pokazać niewielkie przyciski „Edytuj” prowadzące do właściwego ekranu dla oferty, wydarzeń, galerii i wynajmu.
- [ ] Ekrany otwierane przez „Edytuj”: live preview jest gotowy dla wydarzeń; dodać go przy własnych formularzach oferty, galerii i wynajmu, kiedy powstaną.
- [x] Dodać Aktualności analogicznie do wydarzeń: prosty formularz, obowiązkowe zdjęcie i publikacja na stronie.
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

- [x] Każdy ekran CMS ma wyraźny przycisk „Wróć do panelu”; wspólny dla Payload i ujednolicony na `/a/*`.
- [x] Client-side navigation i prefetch w navbarze.
- [x] OpenNext ISR: R2 cache bez timera, unieważnianie po zmianach CMS przez D1 tag cache.
- [x] Mobilny selektor dat rezerwacji.
- [x] Usunięty iframe kalendarza CMS.
- [x] Dodane blokowanie wynajmu i reguły godzinowe.
- [x] CMS jest jedynym instalowalnym PWA.
