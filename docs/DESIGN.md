# Twój Spokój — Dokumentacja Projektowa

## Aplikacja do planowania budżetu domowego

---

## 1. Filozofia Produktu

### 1.1 Cel aplikacji

Aplikacja **Twój Spokój** została stworzona dla par, które chcą świadomie zarządzać swoimi finansami bez poczucia winy, presji czy wzajemnej kontroli. Celem nie jest maksymalizacja oszczędności ani minimalizacja wydatków — celem jest **jasność, spokój i świadomość finansowa**.

### 1.2 Kluczowe założenia

| Zasada | Implementacja |
|--------|---------------|
| Spokój, nie kontrola | Brak gamifikacji, streaków, porównań między partnerami |
| Świadomość, nie automatyzacja | Ręczne wprowadzanie wydatków buduje nawyk refleksji |
| Wspólnota, nie rywalizacja | Jeden wspólny budżet, brak statystyk "kto wydał więcej" |
| Sygnały, nie blokady | Przekroczenie limitu to informacja, nie porażka |
| Prostota, nie funkcjonalność | Minimum funkcji, maksimum użyteczności |

### 1.3 Ton komunikacji

```
Suchy. Spokojny. Neutralny.
Bez emoji. Bez wykrzykników. Bez "Świetnie!" i "Dobra robota!".
Informujemy, nie oceniamy.
```

**Przykłady komunikatów:**

| ❌ Unikamy | ✅ Stosujemy |
|-----------|-------------|
| "Świetnie! Oszczędziłeś 500 zł!" | "Pozostało 500 zł z limitu" |
| "Ups! Przekroczyłeś budżet!" | "Limit przekroczony o 120 zł" |
| "Dzień 15 oszczędzania! 🔥" | (brak komunikatu) |
| "Marlena wydała więcej niż Artur" | (nigdy nie pokazujemy) |

---

## 2. Model Mentalny

### 2.1 Zero-Based Budgeting (Uproszczony)

Aplikacja opiera się na zasadzie **budżetowania od zera**, gdzie każda złotówka ma przypisane przeznaczenie:

```
PRZYCHÓD = OSZCZĘDNOŚCI + WYDATKI (sumy limitów kategorii)
```

### 2.2 Cykl życia miesiąca

```
┌─────────────────────────────────────────────────────────────────┐
│  POCZĄTEK MIESIĄCA                                              │
│  ┌─────────────────┐                                           │
│  │ 1. Wpisz dochód │                                           │
│  └────────┬────────┘                                           │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ 2. Zaplanuj     │  ← "Najpierw oszczędzamy"                │
│  │    oszczędności │                                           │
│  └────────┬────────┘                                           │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ 3. Rozdziel     │                                           │
│  │    resztę na    │                                           │
│  │    kategorie    │                                           │
│  └────────┬────────┘                                           │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ 4. Przelej      │  ← Oszczędności fizycznie opuszczają     │
│  │    oszczędności │    konto bieżące                          │
│  │    na konto     │                                           │
│  └─────────────────┘                                           │
├─────────────────────────────────────────────────────────────────┤
│  W TRAKCIE MIESIĄCA                                             │
│  ┌─────────────────┐                                           │
│  │ Dodawaj wydatki │  ← Szybko, bez oceniania                 │
│  │ ręcznie         │                                           │
│  └────────┬────────┘                                           │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Obserwuj postęp │  ← Dashboard pokazuje stan               │
│  │ na dashboardzie │                                           │
│  └─────────────────┘                                           │
├─────────────────────────────────────────────────────────────────┤
│  KONIEC MIESIĄCA                                                │
│  ┌─────────────────┐                                           │
│  │ Przegląd        │  ← Refleksja, nie rozliczenie            │
│  │ miesiąca        │                                           │
│  └────────┬────────┘                                           │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Planowanie      │  ← Nowy miesiąc z lepszymi limitami      │
│  │ kolejnego       │                                           │
│  └─────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Architektura Systemu

### 3.1 Stack technologiczny

| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| Frontend | React 18 + TypeScript | Stabilność, typowanie |
| Routing | React Router v6 | HashRouter dla prostoty hostingu |
| Styling | Tailwind CSS | Utility-first, szybka iteracja |
| Wykresy | Recharts | Lekka biblioteka, React-native |
| Ikony | Lucide React | Spójna estetyka, tree-shaking |
| Build | Vite | Szybki dev server i build |
| Persistencja | localStorage | MVP bez backendu |

### 3.2 Struktura katalogów

```
src/
├── components/
│   ├── ui/               # Komponenty bazowe (ProgressBar, etc.)
│   ├── Dashboard.tsx     # Główny widok
│   ├── BudgetSetup.tsx   # Planowanie miesiąca
│   ├── AddTransaction.tsx # Dodawanie wydatków
│   ├── MonthReview.tsx   # Statystyki i przegląd
│   └── Layout.tsx        # Shell nawigacyjny
├── context/
│   └── BudgetContext.tsx # Stan globalny
├── types.ts              # Definicje TypeScript
├── constants.ts          # Formatery, helpery
├── App.tsx               # Router główny
└── index.tsx             # Entry point
```

### 3.3 Architektura stanu

```
                    ┌─────────────────────────┐
                    │    BudgetProvider       │
                    │    (Context + State)    │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   Dashboard   │      │  BudgetSetup  │      │ AddTransaction│
│   (read)      │      │  (read/write) │      │  (write)      │
└───────────────┘      └───────────────┘      └───────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │     localStorage        │
                    │     (persistence)       │
                    └─────────────────────────┘
```

---

## 4. Model Danych

### 4.1 Diagram encji

```
┌─────────────────┐       ┌─────────────────┐
│   MonthConfig   │       │    Category     │
├─────────────────┤       ├─────────────────┤
│ id: "YYYY-MM"   │       │ id: string      │
│ totalIncome     │       │ name: string    │
│ savingsGoals[]  │       │ limit: number   │
└─────────────────┘       │ icon: string    │
                          └────────┬────────┘
                                   │
                                   │ categoryId
                                   │
                          ┌────────▼────────┐
                          │   Transaction   │
                          ├─────────────────┤
                          │ id: string      │
                          │ amount: number  │
                          │ categoryId      │
                          │ date: "YYYY-MM-DD"
                          │ note?: string   │
                          │ createdBy       │
                          │ timestamp       │
                          └─────────────────┘
```

### 4.2 Definicje TypeScript

```typescript
// Wydatek lub zwrot (amount > 0 = wydatek, amount < 0 = zwrot)
interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  date: string;           // ISO "YYYY-MM-DD"
  note?: string;
  createdBy: 'Artur' | 'Marlena';
  timestamp: number;
}

// Kategoria z miesięcznym limitem
interface Category {
  id: string;
  name: string;
  limit: number;
  icon: string;           // Lucide icon name
  isSystem?: boolean;
}

// Cel oszczędnościowy (legacy, może być usunięty)
interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  actualAmount: number;
}

// Konfiguracja miesiąca
interface MonthConfig {
  id: string;             // "YYYY-MM"
  totalIncome: number;
  savingsGoals: SavingsGoal[];
}

// Pełny stan aplikacji
interface AppState {
  currentMonthId: string;
  configs: Record<string, MonthConfig>;
  categories: Category[];
  transactions: Transaction[];
}
```

### 4.3 Kategorie domyślne

| ID | Nazwa | Limit domyślny | Ikona |
|----|-------|----------------|-------|
| 1 | Dom i Rachunki | 3000 zł | Home |
| 2 | Jedzenie (Dom) | 2000 zł | ShoppingBasket |
| 3 | Jedzenie (Miasto) | 500 zł | Coffee |
| 4 | Transport | 800 zł | Car |
| 5 | Zdrowie | 300 zł | Heart |
| 6 | Rozrywka | 400 zł | Film |
| 7 | Inne | 200 zł | MoreHorizontal |
| savings | Oszczędności | 0 zł (dynamiczny) | PiggyBank |

### 4.4 Logika oszczędności

Oszczędności w aplikacji są traktowane jako **specjalna kategoria**, nie jako osobna encja:

```
Oszczędności = Kategoria z id="savings"
Limit oszczędności = Przychód - Suma limitów pozostałych kategorii
```

Ta architektura pozwala na:
- Jednorodne traktowanie wszystkich przepływów pieniężnych
- Rejestrowanie faktycznych przelewów na konto oszczędnościowe jako "wydatków" w kategorii Oszczędności
- Śledzenie różnicy między planem a realizacją

---

## 5. Mapa Ekranów

### 5.1 Struktura nawigacji

```
                          ┌─────────────────┐
                          │   /             │
                          │   Dashboard     │
                          │   (domowy)      │
                          └────────┬────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   /add          │      │   /setup        │      │   /statistics   │
│   Dodaj wydatek │      │   Planer budżetu│      │   Przegląd      │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │
         ▼
┌─────────────────┐
│   /edit/:id     │
│   Edytuj wydatek│
└─────────────────┘
```

### 5.2 Opis ekranów

#### Dashboard (`/`)

**Odpowiedzialność:** Pokazać prawdę o stanie finansów w danym miesiącu.

| Element | Opis |
|---------|------|
| Nagłówek | "Twój Spokój", nazwa miesiąca |
| Karta główna | Pozostała kwota do wydania, pasek postępu |
| Lista kategorii | Każda kategoria z postępem i stanem |
| FAB | Przycisk dodawania wydatku (mobile) |

**Stany wizualne kategorii:**

```
0-70%    → Neutralny (szary/biały)
70-90%   → Ostrzeżenie (amber)
90-100%  → Alarmowy (rose)
>100%    → Przekroczony (rose, tekst "Przekroczono o X")
```

**Zasady UX:**
- Brak licznika dni do końca miesiąca (unikamy presji)
- Kategorie sortowane od najbardziej wykorzystanych
- Oszczędności zawsze na końcu (wyróżnione kolorem zielonym)

---

#### Dodaj Wydatek (`/add`, `/edit/:id`)

**Odpowiedzialność:** Maksymalnie szybkie dodawanie wydatków.

| Element | Opis |
|---------|------|
| Toggle typu | Wydatek / Zwrot (domyślnie: Wydatek) |
| Kwota | Duże pole numeryczne, autofocus |
| Kategorie | Grid 2x4 z przyciskami |
| Notatka | Opcjonalne pole tekstowe |
| Data | Domyślnie: dziś |
| Kto | Artur / Marlena |
| Przycisk zapisu | "Dodaj Wydatek" / "Zapisz Zmiany" |

**Zasady UX:**
- Zero komunikatów blokujących
- Zero ostrzeżeń przy przekroczeniu limitu
- Minimum kliknięć do zapisania (cel: 3 tapnięcia)
- Data domyślnie "dziś" — najczęstszy przypadek

---

#### Planer Budżetu (`/setup`)

**Odpowiedzialność:** Zaplanować miesiąc przed rozpoczęciem wydawania.

| Element | Opis |
|---------|------|
| Przychód | Pole numeryczne "Ile zarobimy?" |
| Kategorie | Lista z limitami do edycji |
| Suma wydatków | Automatycznie obliczana |
| Oszczędności | Sugestia: Przychód - Wydatki |
| Bilans | Wskaźnik "Do rozdysponowania" / "Budżet zbilansowany" |
| Zapisz | Aktywny tylko gdy budżet >= 0 |

**Logika bilansu:**

```
Nieprzypisane = Przychód - Suma(Limity kategorii) - Oszczędności

Jeśli Nieprzypisane = 0  → "Budżet zbilansowany" (zielony)
Jeśli Nieprzypisane > 0  → "Do rozdysponowania: X zł" (amber)
Jeśli Nieprzypisane < 0  → "Przekroczenie: X zł" (rose, zapis zablokowany)
```

**Zasady UX:**
- Przycisk "Przenieś tutaj" pozwala jednym kliknięciem przypisać nadwyżkę do oszczędności
- Limity kategorii są osobne od konfiguracji miesiąca (persystują między miesiącami)
- Oszczędności są traktowane jak zobowiązanie, nie opcja

---

#### Przegląd Miesiąca (`/statistics`)

**Odpowiedzialność:** Refleksja nad minionym miesiącem, nie surowa analityka.

| Element | Opis |
|---------|------|
| Wykres efektywności | Pasek: Wydatki vs Oszczędności |
| Wykres struktury | Donut chart kategorii |
| Lista transakcji | Filtrowana, klikalna |

**Zasady UX:**
- Brak porównań między partnerami
- Brak trendu historycznego (MVP)
- Cel: odpowiedzieć na pytania:
  - Które kategorie były niedoszacowane?
  - Co było zaskoczeniem?
  - Czy limity były realistyczne?

---

### 5.3 Nawigacja dolna (Mobile)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  [Dashboard]     [+ Dodaj]     [Statystyki]    │
│     📊              ➕              📈          │
│                                                 │
└─────────────────────────────────────────────────┘
```

- FAB "Dodaj" jest centralny i wyróżniony
- Dashboard i Statystyki są równorzędne
- Brak ikony ustawień w nawigacji głównej (dostęp z Dashboard)

---

## 6. Kluczowe Flow Użytkownika

### 6.1 Flow: Początek miesiąca

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Użytkownik otwiera aplikację                                 │
│    → Dashboard pokazuje poprzedni miesiąc (lub pusty)           │
├─────────────────────────────────────────────────────────────────┤
│ 2. Klika "Ustawienia Budżetu"                                   │
│    → Przechodzi do /setup                                       │
├─────────────────────────────────────────────────────────────────┤
│ 3. Wpisuje łączny dochód                                        │
│    → System oblicza "Zostaje (Przychód - Wydatki)"              │
├─────────────────────────────────────────────────────────────────┤
│ 4. Sprawdza/modyfikuje limity kategorii                         │
│    → Suma aktualizuje się na żywo                               │
├─────────────────────────────────────────────────────────────────┤
│ 5. Klika "Przenieś tutaj" przy oszczędnościach                  │
│    → Nadwyżka trafia do kategorii Oszczędności                  │
├─────────────────────────────────────────────────────────────────┤
│ 6. Wskaźnik pokazuje "Budżet zbilansowany"                      │
│    → Przycisk "Zatwierdź Plan" staje się aktywny                │
├─────────────────────────────────────────────────────────────────┤
│ 7. Użytkownik zatwierdza plan                                   │
│    → Powrót do Dashboard z nowymi limitami                      │
├─────────────────────────────────────────────────────────────────┤
│ 8. Użytkownik przelewa oszczędności na osobne konto             │
│    → (akcja poza aplikacją, ale zgodna z planem)                │
├─────────────────────────────────────────────────────────────────┤
│ 9. W aplikacji dodaje "wydatek" w kategorii Oszczędności        │
│    → Rejestruje faktyczny przelew                               │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Flow: Codzienne dodawanie wydatków

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Użytkownik klika FAB "+" na Dashboard                        │
│    → Otwiera się /add z autofocusem na kwocie                   │
├─────────────────────────────────────────────────────────────────┤
│ 2. Wpisuje kwotę (np. 45)                                       │
│    → Klawiatura numeryczna                                      │
├─────────────────────────────────────────────────────────────────┤
│ 3. Wybiera kategorię (np. "Jedzenie (Miasto)")                  │
│    → Jedno tapnięcie                                            │
├─────────────────────────────────────────────────────────────────┤
│ 4. (Opcjonalnie) Dodaje notatkę                                 │
│    → "Lunch z zespołem"                                         │
├─────────────────────────────────────────────────────────────────┤
│ 5. Data = dziś (domyślnie)                                      │
│    → Bez zmian, chyba że wpis wsteczny                          │
├─────────────────────────────────────────────────────────────────┤
│ 6. Kto = domyślnie pierwszy partner                             │
│    → Zmiana jednym tapnięciem jeśli potrzeba                    │
├─────────────────────────────────────────────────────────────────┤
│ 7. Klika "Dodaj Wydatek"                                        │
│    → Powrót do Dashboard, wydatek widoczny w kategorii          │
└─────────────────────────────────────────────────────────────────┘

Czas operacji: < 10 sekund
```

### 6.3 Flow: Obsługa przekroczenia limitu

```
┌─────────────────────────────────────────────────────────────────┐
│ SCENARIUSZ: Kategoria "Rozrywka" ma limit 400 zł                │
│             Wydano już 380 zł                                   │
│             Użytkownik chce dodać 50 zł                         │
├─────────────────────────────────────────────────────────────────┤
│ 1. Użytkownik dodaje wydatek 50 zł w kategorii Rozrywka         │
│    → Aplikacja ZAPISUJE wydatek bez ostrzeżeń                   │
├─────────────────────────────────────────────────────────────────┤
│ 2. Na Dashboard kategoria Rozrywka pokazuje:                    │
│    → Pasek postępu > 100% (wizualnie "przelany")                │
│    → Tekst: "Przekroczono o 30 zł"                              │
│    → Kolor: spokojny rose, nie agresywny czerwony               │
├─────────────────────────────────────────────────────────────────┤
│ 3. Kwota "Pozostało do wydania" zmniejsza się                   │
│    → Może być ujemna jeśli suma przekroczeń > nadwyżka          │
├─────────────────────────────────────────────────────────────────┤
│ 4. BRAK:                                                        │
│    → Komunikatów typu "Czy na pewno?"                           │
│    → Blokowania zapisu                                          │
│    → Powiadomień push                                           │
│    → Zmian w tonie komunikacji                                  │
└─────────────────────────────────────────────────────────────────┘

Filozofia: Przekroczenie limitu jest informacją do refleksji,
           nie błędem do naprawienia.
```

### 6.4 Flow: Przegląd końca miesiąca

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Użytkownik przechodzi do /statistics                         │
│    → Widzi podsumowanie miesiąca                                │
├─────────────────────────────────────────────────────────────────┤
│ 2. Analizuje wykres efektywności                                │
│    → "70% na wydatki, 30% oszczędności"                         │
├─────────────────────────────────────────────────────────────────┤
│ 3. Przegląda strukturę wydatków (donut chart)                   │
│    → Widzi proporcje kategorii                                  │
├─────────────────────────────────────────────────────────────────┤
│ 4. Filtruje listę transakcji po kategorii                       │
│    → Może kliknąć w transakcję żeby ją edytować                 │
├─────────────────────────────────────────────────────────────────┤
│ 5. Refleksja (bez UI, w głowie użytkownika):                    │
│    → "Jedzenie (Miasto) było niedoszacowane"                    │
│    → "Transport był przeszacowany"                              │
│    → "Limit oszczędności był realistyczny"                      │
├─────────────────────────────────────────────────────────────────┤
│ 6. Przechodzi do /setup żeby zaplanować kolejny miesiąc         │
│    → Uwzględnia wnioski z refleksji                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Zasady UX

### 7.1 Priorytety projektowe

```
1. SPOKÓJ        > Efektywność
2. JASNOŚĆ       > Precyzja
3. PROSTOTA      > Funkcjonalność
4. ŚWIADOMOŚĆ    > Automatyzacja
5. WSPÓLNOTA     > Indywidualizm
```

### 7.2 Decyzje projektowe

| Pytanie | Odpowiedź | Uzasadnienie |
|---------|-----------|--------------|
| Czy blokować wydatki po przekroczeniu limitu? | Nie | Limity to sygnały, nie blokady |
| Czy pokazywać "kto wydał więcej"? | Nie | Unikamy napięć między partnerami |
| Czy dodawać streak za codzienne logowanie? | Nie | Brak gamifikacji |
| Czy wysyłać powiadomienia push? | Nie (MVP) | Unikamy presji |
| Czy automatycznie kategoryzować wydatki? | Nie | Świadomość > automatyzacja |
| Czy pokazywać trendy historyczne? | Nie (MVP) | Prostota |
| Czy pozwalać na ujemne saldo? | Tak | Pokazujemy prawdę |

### 7.3 Paleta kolorów

```css
/* Neutralne — dominujące */
--neutral-50:  #FAFAFA;
--neutral-100: #F5F5F5;
--neutral-200: #E5E5E5;
--neutral-400: #A3A3A3;
--neutral-500: #737373;
--neutral-600: #525252;
--neutral-700: #404040;
--neutral-800: #262626;

/* Akcenty — używane oszczędnie */
--calm-blue:   #4F46E5;  /* Akcja główna */
--calm-rose:   #F43F5E;  /* Przekroczenie (spokojny) */
--emerald-500: #10B981;  /* Oszczędności */
--amber-500:   #F59E0B;  /* Ostrzeżenie */
```

### 7.4 Typografia

```css
/* Hierarchia */
H1: 24-30px, font-bold, tracking-tight    /* Nagłówki ekranów */
H2: 18px, font-medium                      /* Sekcje */
Body: 14px, font-normal                    /* Treść */
Small: 12px, font-medium, uppercase        /* Etykiety */
Mono: 36-48px, font-bold                   /* Kwoty główne */
```

### 7.5 Animacje

```css
/* Tylko funkcjonalne przejścia */
transition-all: 150ms ease-in-out;

/* Brak: */
- Bounce effects
- Celebracyjnych animacji
- Confetti
- Shake przy błędach
```

---

## 8. Roadmap MVP → V2

### 8.1 MVP (Obecna wersja)

- [x] Dashboard z postępem kategorii
- [x] Szybkie dodawanie wydatków
- [x] Planer budżetu miesięcznego
- [x] Kategoria oszczędności
- [x] Podstawowe statystyki
- [x] localStorage persistence
- [x] Responsywność (mobile-first)

### 8.2 V2 (Planowane)

| Funkcja | Priorytet | Uzasadnienie |
|---------|-----------|--------------|
| Sync między urządzeniami | Wysoki | Para = 2 telefony |
| Historia miesięcy | Średni | Refleksja długoterminowa |
| Eksport danych | Średni | Bezpieczeństwo |
| Wiele celów oszczędnościowych | Niski | Wykończenie domu + wakacje |
| Kategorie niestandardowe | Niski | Personalizacja |
| Dark mode | Niski | Komfort |

### 8.3 Celowo pominięte (nigdy)

- Gamifikacja
- Porównania partnerów
- AI insights
- Automatyczna kategoryzacja
- Integracja bankowa
- Social features
- Reklamy

---

## 9. Metryki sukcesu

### 9.1 Miary jakościowe

| Metryka | Cel |
|---------|-----|
| Zmęczenie emocjonalne | Aplikacja może być używana latami bez frustracji |
| Czas dodania wydatku | < 10 sekund |
| Poczucie kontroli | "Wiem gdzie są moje pieniądze" |
| Relacja w parze | Brak napięć związanych z aplikacją |

### 9.2 Miary ilościowe (wewnętrzne)

| Metryka | Jak mierzyć |
|---------|-------------|
| Retencja miesięczna | Czy budżet jest planowany co miesiąc |
| Kompletność danych | Czy wszystkie wydatki są logowane |
| Bilans miesięczny | Czy budżet jest zbilansowany przy planowaniu |

---

## 10. Załączniki

### 10.1 Słownik pojęć

| Termin | Definicja |
|--------|-----------|
| Budżet | Suma wszystkich limitów kategorii na dany miesiąc |
| Limit | Maksymalna kwota przeznaczona na kategorię |
| Wydatek | Transakcja zmniejszająca dostępne środki |
| Zwrot | Transakcja zwiększająca dostępne środki w kategorii |
| Oszczędności | Środki przelane na osobne konto na początku miesiąca |
| Bilans | Różnica między przychodem a sumą limitów |

### 10.2 Wzorce nazewnictwa

```typescript
// Komponenty: PascalCase
Dashboard.tsx
BudgetSetup.tsx

// Funkcje: camelCase
addTransaction()
updateCategoryLimit()

// Stałe: SCREAMING_SNAKE_CASE
CURRENCY_FORMATTER
STORAGE_KEY

// Typy: PascalCase
interface Transaction {}
type CreatedBy = 'Artur' | 'Marlena';
```

### 10.3 Struktura commitów

```
feat: Add monthly review screen
fix: Correct savings calculation
refactor: Extract ProgressBar component
docs: Update design documentation
style: Adjust category card spacing
```

---

## Autorzy

Dokument projektowy dla aplikacji **Twój Spokój**.

Wersja: 1.0
Data: 2026-01
