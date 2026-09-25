# Automatyczna synchronizacja terminarzy

Moduł pobiera terminarze ze Sportowych Beskidów dla:

- Ligi Okręgowej Żywiecko-Skoczowskiej,
- A-klasy Żywiec,
- B-klasy Żywiec,
- Pucharu Polski Podokręgu Żywiec.

GitHub Actions uruchamia synchronizację co 3 godziny i zapisuje zmiany w `matches.js` tylko wtedy, gdy źródło zwróci poprawne dane. Skrypt zachowuje dotychczasowe identyfikatory meczów na podstawie ligi i pary drużyn, aby nie odłączyć zapisanych typów.

## Zabezpieczenia

- aktualizacja jest przerywana, jeśli strona źródłowa nie zwróci tabeli lub wystarczającej liczby meczów;
- pobierane są spotkania z ostatnich 10 i kolejnych 60 dni;
- mecze bez ustalonej godziny otrzymują status „Termin do potwierdzenia”;
- raport ostatniego pobrania trafia do `data/sync-report.json`;
- skrypt nie usuwa ani nie modyfikuje typów i wyników zapisanych w Supabase.

Synchronizację można również uruchomić ręcznie w zakładce **Actions → Aktualizacja terminarzy → Run workflow**.
