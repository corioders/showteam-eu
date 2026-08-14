# SHOWteam — kolejka prac

Aktualizuj ten plik po każdym ukończonym kroku. Nie zamykaj zadania bez testu, commita i pushu.

## W toku

- [x] Uporządkować formularz „Jedziesz z nami”: pokazywać tylko pytania mające sens dla wybranej kategorii; przy Szkoleniach nie pytać o dyscyplinę ani poziom.

- [ ] Google Calendar zamiast iCal:
  - [x] Usunąć prywatne feedy ICS i ich ekran.
  - [x] Połączyć jedno konto Google przez OAuth z zaszyfrowanym tokenem.
  - [x] Wysyłać rezerwacje do Google Calendar bez duplikatów.
  - [x] Pobierać ręczne wpisy Google do kalendarza bazy i TV.
  - [x] Pokazać blokady wynajmu, wyjątki godzin i plany Google różnymi kolorami.
  - [ ] W Google Cloud włączyć Calendar API i utworzyć klienta OAuth z callbackiem `https://showteam-eu.corioders.workers.dev/api/admin/google-calendar/callback`.
  - [ ] Dodać sekrety Workera `GOOGLE_CALENDAR_CLIENT_ID` i `GOOGLE_CALENDAR_CLIENT_SECRET`; `GOOGLE_CALENDAR_TOKEN_KEY` jest już ustawiony.
  - [ ] W panelu podłączyć wspólne konto SHOWteam i udostępnić jego kalendarz obsłudze na telefonach.
  - [ ] Test końcowy: rezerwacja strona → Google oraz ręczny wpis Google → panel i TV.

- [x] Ułatwić publiczne zgłoszenia uczestników:
  - [x] Pracować w osobnym worktree na branchu `feat/application-form-visibility`.
  - [x] Pokazać wyraźny link „Zgłoszenie” w nagłówku i menu mobilnym.
  - [x] Najpierw wybierać Lato, Zima albo Szkolenia, a dopiero później termin.
  - [x] Nie pokazywać terminów, które już się zakończyły; trwający termin pozostaje dostępny do ostatniego dnia.
  - [x] Pokazywać transport autokarem tylko dla Zimy; po zmianie kategorii czyścić odpowiedź.
  - [x] Nadal zapisywać pełną datę urodzenia, a na ekranie zgłoszeń pokazywać też aktualny wiek.
  - [x] Sprawdzić wygląd formularza na telefonie i desktopie.
  - [x] Uruchomić końcowy build i testy.
  - [x] Zrobić commit i push brancha.
  - [x] Przed jakimkolwiek merge’em pokazać użytkownikowi efekt i poczekać na zgodę; nie robić preview deployu.
- [x] Rezerwacje zależne od warunków: edytowalne polecane godziny per sprzęt, prognoza wiatru Jeziora Łąckiego i jasna możliwość zamiany sprzętu.
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
- [x] Historia uczestnika: łączyć zgłoszenia bez mylenia rodzeństwa, pokazać wcześniejsze turnusy i oznaczenie „nowy” / „powracający”.
- [x] Kontakty newslettera: deduplikowana lista e-maili ze zgodą marketingową i eksport; bez wysyłki do czasu podpięcia dostawcy poczty.
- [x] Statystyki zgłoszeń: nowi i powracający uczestnicy, liczba zgłoszeń oraz najpopularniejsze oferty w czasie.
- [x] Galeria: responsywny układ kafelków oraz pełnoekranowy lightbox ze swipe i nawigacją poprzednie/następne.
- [x] Uploader galerii: przed wysłaniem tworzyć warianty WebP dla różnych ekranów, zachować wariant wysokiej jakości do lightboxa i zablokować surowy upload poza prostym uploaderem.
- [x] Przetworzyć istniejącą galerię tym samym pipeline'em wariantów WebP i podłączyć poprawne `srcset`/`sizes`.

## Do weryfikacji po deployu

- [ ] Safari/iPhone: `/admin/kalendarz` zawsze startuje jako lista; brak widoku tygodnia i zagnieżdżonego scrolla.
- [ ] Safari/iPhone: CMS header nie nachodzi na tytuł formularza.
- [ ] Blokady wynajmu: cały dzień domyślnie, opcjonalne własne godziny, wszystkie albo jeden sprzęt.
- [ ] Statystyki używają etykiety „Odwiedziny strony”.
- [ ] Oficjalny TikTok prowadzi do `https://www.tiktok.com/@showteam1969`.

## Ukończone

- [x] Rezerwacje: spójny stan navbara, Padel oraz profile sprzętu: skuter/Padel — każdy warun; Wingfoil/windsurfing/Hobie Cat/łódź żaglowa — wiatr; SUP/kajak — spokojna woda.
- [x] Każda wolna godzina ma jawny poziom: najlepszy, średni, słaby albo profesjonalny; bardzo mocny wiatr jest oznaczony jako warun tylko dla doświadczonych.
- [x] Oferty Lato, Zima i Szkolenia mają klikalne pinezki Google Maps; Szkolenia używają lokalizacji bazy z oferty Lato.
- [x] Publiczne copy nie pokazuje technicznych, roboczych ani CMS-owych dopowiedzeń.
- [x] Prognoza wiatru wpływa na rekomendacje maksymalnie 7 dni naprzód; kafle sprzętu pokazują najlepszy warun.
- [x] CTA ofert lata, zimy i szkoleń prowadzą bezpośrednio do formularza zgłoszeniowego.
- [x] „Noclegi nad wodą” są widoczne w menu, stopce i skrótach oferty na stronie głównej.
- [x] Oficjalne logotypy z `Flagi ShowTeam.pdf` są używane w nagłówku, CMS, faviconie i ikonach PWA.
- [x] Dodać pełny film promocyjny SHOWteam z muzyką do galerii.
- [x] Każdy ekran CMS ma wyraźny przycisk „Wróć do panelu”; wspólny dla Payload i ujednolicony na `/a/*`.
- [x] Client-side navigation i prefetch w navbarze.
- [x] OpenNext ISR: R2 cache bez timera, unieważnianie po zmianach CMS przez D1 tag cache.
- [x] Mobilny selektor dat rezerwacji.
- [x] Usunięty iframe kalendarza CMS.
- [x] Dodane blokowanie wynajmu i reguły godzinowe.
- [x] CMS jest jedynym instalowalnym PWA.
