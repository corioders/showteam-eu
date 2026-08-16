# SHOWteam — kolejka prac

Aktualizuj ten plik po każdym ukończonym kroku. Nie zamykaj zadania bez testu, commita i pushu.

## W toku

- [ ] Przebudowa WAKE & SURF Village — zakres roboczy w `USTALENIA-WAKE-SURF.md`:
  - [x] Usunąć Aktualności oraz integrację i testowe dane Google Calendar.
  - [x] Zastąpić publiczny model sprzętu katalogiem aktywności bez cen.
  - [x] Dodać globalne godziny bazy, wyjątki kalendarzowe i zakaz weekendowy per aktywność.
  - [x] Zastąpić blokady wewnętrznymi wydarzeniami, także całodniowymi i cyklicznymi.
  - [x] Dodać formularz oraz obsługę imprez i spływów.
  - [ ] Dodać statusy rezerwacji, instruktora, fakturę i wymagane przepływy zgłoszeń.
  - [ ] Dodać powiadomienia PWA, przypomnienia SMS i eskalację do Asi.
  - [ ] Zbudować osobny przepływ rezerwacji noclegów.
  - [ ] Zaktualizować branding, oferty, szkolenia, partnerstwa i treści strony.

- [x] Rozszerzyć bezpośrednią edycję strony — zakres zatwierdzony 2026-08-16:
  - [x] Strona główna: pozycje 1.1–1.12; bez edycji kafelków ofert bezpośrednio na stronie głównej (1.13).
  - [x] Wspólne elementy ofert: cały punkt 2 — okładka, publikacja, tworzenie/usuwanie/kolejność/URL, mapy, CTA i sekcje szczegółowe.
  - [x] Podstrony Lato, Zima, Szkolenia i Noclegi: całe punkty 3–6.
  - [x] Rezerwacje: cały punkt 7 — copy, zdjęcia i kolejność sprzętu, usuwanie oraz dostępność przy sprzęcie.
  - [x] Galeria: cały punkt 8 — copy, kolejność i wymiana istniejących plików.
  - [x] Galeria: zastąpić niedziałające suwaki kadru gotowym mobilnym edytorem open source.
  - [x] Kontakt i o nas: cały punkt 9 — dane kontaktowe, social media, mapa i treść.
  - Zgodnie z decyzją poza tym zakresem: formularz zgłoszeniowy (10) i elementy globalne (11).

- [x] Nowy panel bezpośrednio na stronie (`codex/new-admin`):
  - [x] `/admin` służy do logowania, a po zalogowaniu otwiera stronę w trybie edycji.
  - [x] Wspólny pasek administratora oraz możliwość ukrycia przycisków edycji.
  - [x] Kontekstowe edytowanie treści ofert bez opuszczania strony.
    - [x] Nazwa, kategoria, sezon, lokalizacja, opis, terminy, wyróżniki i publikacja.
    - [x] Pola podstawowej oferty edytowane bezpośrednio w miejscu ich wyświetlania, z natychmiastowym podglądem.
    - [x] Zdjęcie okładkowe i pozostałe teksty specyficzne dla podstron Lato, Zima i Szkolenia.
  - [x] Kontekstowe dodawanie i edytowanie sprzętu na stronie Rezerwacje.
  - [x] Kontekstowe dodawanie i edytowanie mediów w Galerii.
  - [x] Kalendarz, zgłoszenia, statystyki i telewizory w spójnym interfejsie strony.
  - [x] Pełny Payload wyłącznie jako drugorzędny tryb „Zaawansowane”.
  - [x] Zapis oferty natychmiast odświeża edytowaną podstronę i stronę główną.
  - [x] Publiczne dane CMS są pobierane przy pierwszym żądaniu, cache’owane bez timera i natychmiast unieważniane po zapisie.
  - [x] Terminy ofert są strukturalne: obowiązkowa nazwa, data rozpoczęcia i data zakończenia; bez dowolnego tekstu zamiast daty.

- [x] Przejrzeć folder `media od asi`, skatalogować oficjalne logotypy i materiały oraz wykorzystać właściwe źródła w serwisie.
- [x] Rezerwacje: dodać przy każdym sprzęcie edytowalne progi wiatru dla warunu słabego, średniego i najlepszego; przy sprzęcie wymagającym wiatru opcjonalny próg „profesjonalny” od wskazanej prędkości.
- [x] Przebudować pełnoekranowe menu: zwarty układ desktopowy bez ogromnych pustych kafli; zachować czytelny układ mobilny.
- [x] Hero: zrobić klikalne lokalizacje Poręba, Dolomity i Andorra, prowadzące do właściwych map Google.
- [x] Zmienić etykietę „Kontakt” na „Kontakt i o nas” oraz dodać na stronie kontaktowej krótką sekcję o SHOWteam.
- [x] Galeria: usunąć natywne kontrolki wideo z kafli; kafel ma otwierać czytelny player w lightboxie z jednym przyciskiem odtwarzania.

- [x] Uporządkować formularz „Jedziesz z nami”: pokazywać tylko pytania mające sens dla wybranej kategorii; przy Szkoleniach nie pytać o dyscyplinę ani poziom.

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
- [x] Zastąpić szybkie akcje ofert i sprzętu prostą edycją bezpośrednio na publicznej stronie.
- [x] Zostawić pełny Payload CMS jako drugorzędne „Zaawansowane”, dostępne z panelu awaryjnie.
- [x] Tryb redakcyjny strony: po zalogowaniu pokazać kontekstowe przyciski edycji ofert, galerii i wynajmu.
- [x] Zapewnić live preview: oferta zmienia się w miejscu, galeria pokazuje dokładny kadr, a formularz sprzętu ma podgląd karty.
- [x] Dodać widoczny przycisk „Wyczyść formularz” do własnych formularzy i formularzy Payload; musi usuwać także lokalnie zapisany draft.
- [x] Formularz zgłoszeniowy wzorowany na obecnym SHOWteam: zapis do bazy, prosty ekran administracyjny i eksport do Excela. E-mail pozostaje wyłączony do późniejszej konfiguracji.
- [ ] Po otrzymaniu docelowego formatu eksportu zmienić układ kolumn zgłoszeń; zapisane dane i formularz pozostają bez zmian.
- [x] Historia uczestnika: łączyć zgłoszenia bez mylenia rodzeństwa, pokazać wcześniejsze turnusy i oznaczenie „nowy” / „powracający”.
- [x] Kontakty newslettera: deduplikowana lista e-maili ze zgodą marketingową i eksport; bez wysyłki do czasu podpięcia dostawcy poczty.
- [x] Statystyki zgłoszeń: nowi i powracający uczestnicy, liczba zgłoszeń oraz najpopularniejsze oferty w czasie.
- [x] Galeria: responsywny układ kafelków oraz pełnoekranowy lightbox ze swipe i nawigacją poprzednie/następne.
- [x] Uploader galerii: przed wysłaniem tworzyć warianty WebP dla różnych ekranów, zachować wariant wysokiej jakości do lightboxa i zablokować surowy upload poza prostym uploaderem.
- [x] Przetworzyć istniejącą galerię tym samym pipeline'em wariantów WebP i podłączyć poprawne `srcset`/`sizes`.

## Ukończone

- [x] Statystyki używają etykiety „Odwiedziny strony”.
- [x] Oficjalny TikTok prowadzi do `https://www.tiktok.com/@showteam1969`.
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
