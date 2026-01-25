# Architektura Techniczna — Twój Spokój

## 1. Przegląd systemu

### 1.1 Diagram wysokopoziomowy

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WARSTWA PREZENTACJI                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Dashboard  │  │   Budget    │  │    Add      │  │   Month     │ │
│  │             │  │   Setup     │  │ Transaction │  │   Review    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                                   │                                  │
├───────────────────────────────────┼──────────────────────────────────┤
│                         WARSTWA STANU                                │
│                                   │                                  │
│                    ┌──────────────▼──────────────┐                  │
│                    │      BudgetContext          │                  │
│                    │  ┌──────────────────────┐   │                  │
│                    │  │      AppState        │   │                  │
│                    │  │  - currentMonthId    │   │                  │
│                    │  │  - configs           │   │                  │
│                    │  │  - categories        │   │                  │
│                    │  │  - transactions      │   │                  │
│                    │  └──────────────────────┘   │                  │
│                    └──────────────┬──────────────┘                  │
│                                   │                                  │
├───────────────────────────────────┼──────────────────────────────────┤
│                      WARSTWA PERSYSTENCJI                            │
│                                   │                                  │
│                    ┌──────────────▼──────────────┐                  │
│                    │       localStorage          │                  │
│                    │   Key: "spokoj-app-data-v1" │                  │
│                    └─────────────────────────────┘                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Decyzje architektoniczne

| Decyzja | Wybór | Alternatywa | Uzasadnienie |
|---------|-------|-------------|--------------|
| Stan globalny | React Context | Redux, Zustand | Prosty stan, brak potrzeby middleware |
| Routing | HashRouter | BrowserRouter | Prostsze hostowanie (GitHub Pages, S3) |
| Persystencja | localStorage | IndexedDB, Backend | MVP bez serwera |
| Styling | Tailwind CSS | CSS Modules, Styled | Szybka iteracja, utility-first |
| Build | Vite | Webpack, CRA | Szybkość dev, ESM native |

---

## 2. Model danych — szczegóły

### 2.1 Schemat stanu

```typescript
interface AppState {
  // Identyfikator bieżącego miesiąca w formacie "YYYY-MM"
  currentMonthId: string;

  // Konfiguracje miesięcy (przychód, cele oszczędnościowe)
  // Klucz: "YYYY-MM"
  configs: Record<string, MonthConfig>;

  // Lista kategorii z limitami (współdzielona między miesiącami)
  categories: Category[];

  // Wszystkie transakcje (filtrowane po dacie dla danego miesiąca)
  transactions: Transaction[];
}
```

### 2.2 Transakcje

```typescript
interface Transaction {
  id: string;           // UUID v4 (crypto.randomUUID())
  amount: number;       // > 0 = wydatek, < 0 = zwrot/wpływ
  categoryId: string;   // Referencja do Category.id
  date: string;         // ISO 8601: "YYYY-MM-DD"
  note?: string;        // Opcjonalny opis
  createdBy: 'Artur' | 'Marlena';  // Kto dodał
  timestamp: number;    // Date.now() przy tworzeniu
}
```

**Operacje na transakcjach:**

```typescript
// Dodanie
addTransaction(input: Omit<Transaction, 'id' | 'timestamp'>): void

// Edycja
editTransaction(id: string, updated: Partial<Omit<Transaction, 'id' | 'timestamp'>>): void

// Usunięcie
deleteTransaction(id: string): void
```

### 2.3 Kategorie

```typescript
interface Category {
  id: string;           // Unikalne ID (numeryczne lub "savings")
  name: string;         // Nazwa wyświetlana
  limit: number;        // Miesięczny limit w PLN
  icon: string;         // Nazwa ikony Lucide
  isSystem?: boolean;   // Czy systemowa (np. Oszczędności)
}
```

**Specjalna kategoria "Oszczędności":**

- `id: "savings"` — stały identyfikator
- Limit = dynamiczny (Przychód - Suma innych limitów)
- Wydatki w tej kategorii = faktyczne przelewy na konto oszczędnościowe

### 2.4 Konfiguracja miesiąca

```typescript
interface MonthConfig {
  id: string;               // "YYYY-MM"
  totalIncome: number;      // Łączny przychód gospodarstwa
  savingsGoals: SavingsGoal[]; // Legacy, do usunięcia w v2
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;     // Plan
  actualAmount: number;     // Realizacja
}
```

---

## 3. Przepływ danych

### 3.1 Cykl życia stanu

```
┌─────────────────────────────────────────────────────────────────┐
│                         INICJALIZACJA                           │
├─────────────────────────────────────────────────────────────────┤
│ 1. App renderuje BudgetProvider                                 │
│ 2. BudgetProvider wykonuje useState z funkcją inicjalizującą:   │
│    a. Próba odczytu z localStorage                              │
│    b. Jeśli sukces → parsowanie JSON → walidacja                │
│    c. Jeśli błąd → stan domyślny (DEFAULT_CATEGORIES, etc.)    │
│ 3. Migracja danych (np. dodanie kategorii "savings")            │
│ 4. Stan gotowy do użycia                                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         UŻYTKOWANIE                             │
├─────────────────────────────────────────────────────────────────┤
│ 1. Komponent wywołuje useBudget()                               │
│ 2. Hook zwraca { state, addTransaction, ... }                   │
│ 3. Komponent renderuje na podstawie state                       │
│ 4. User interaction → wywołanie akcji (np. addTransaction)      │
│ 5. Akcja wywołuje setState z nowym stanem                       │
│ 6. React re-renderuje komponenty zależne                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         PERSYSTENCJA                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. useEffect w BudgetProvider obserwuje state                   │
│ 2. Przy każdej zmianie → JSON.stringify(state)                  │
│ 3. localStorage.setItem(STORAGE_KEY, json)                      │
│ 4. Dane zapisane synchronicznie                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Diagram sekwencji — dodanie wydatku

```
User          AddTransaction    BudgetContext    localStorage
  │                 │                 │                │
  │ wpisuje kwotę   │                 │                │
  │────────────────>│                 │                │
  │                 │                 │                │
  │ wybiera kategorię                 │                │
  │────────────────>│                 │                │
  │                 │                 │                │
  │ klika "Dodaj"   │                 │                │
  │────────────────>│                 │                │
  │                 │                 │                │
  │                 │ addTransaction()│                │
  │                 │────────────────>│                │
  │                 │                 │                │
  │                 │                 │ setState()     │
  │                 │                 │───────────┐    │
  │                 │                 │           │    │
  │                 │                 │<──────────┘    │
  │                 │                 │                │
  │                 │                 │ useEffect      │
  │                 │                 │───────────────>│
  │                 │                 │                │ setItem()
  │                 │                 │                │
  │ navigate('/')   │                 │                │
  │<────────────────│                 │                │
  │                 │                 │                │
```

---

## 4. Komponenty — szczegóły

### 4.1 Hierarchia komponentów

```
App
├── BudgetProvider (Context)
│   └── HashRouter
│       └── Routes
│           ├── Layout
│           │   ├── Dashboard
│           │   │   └── ProgressBar
│           │   └── Statistics (MonthReview)
│           │       └── ProgressBar
│           ├── AddTransaction
│           └── BudgetSetup
│               └── ProgressBar
```

### 4.2 Dashboard

**Plik:** `components/Dashboard.tsx`

**Odpowiedzialności:**
- Wyświetlenie stanu bieżącego miesiąca
- Obliczenie postępu kategorii
- Sortowanie kategorii po wykorzystaniu
- Wyróżnienie kategorii Oszczędności

**Obliczenia:**

```typescript
// Suma limitów wszystkich kategorii = budżet
const totalBudget = categories.reduce((acc, cat) => acc + cat.limit, 0);

// Suma wszystkich transakcji w miesiącu
const totalSpent = currentTransactions.reduce((acc, t) => acc + t.amount, 0);

// Pozostało do wydania
const remaining = totalBudget - totalSpent;

// Procent wykorzystania budżetu
const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) : 0;

// Statystyki per kategoria
const categoryStats = categories.map(cat => {
  const spent = currentTransactions
    .filter(t => t.categoryId === cat.id)
    .reduce((acc, t) => acc + t.amount, 0);
  return {
    ...cat,
    spent,
    remaining: cat.limit - spent,
    percent: cat.limit > 0 ? spent / cat.limit : 0,
  };
});
```

### 4.3 BudgetSetup

**Plik:** `components/BudgetSetup.tsx`

**Odpowiedzialności:**
- Edycja przychodu miesiąca
- Edycja limitów kategorii
- Obliczenie bilansu (nieprzypisane środki)
- Walidacja przed zapisem

**Logika bilansu:**

```typescript
// Suma limitów BEZ oszczędności
const expensesSum = Object.entries(localLimits)
  .filter(([id]) => id !== 'savings')
  .reduce((acc, [_, limit]) => acc + limit, 0);

// Suma z oszczędnościami
const totalAllocated = expensesSum + savingsLimit;

// Nieprzypisane środki
const unassigned = income - totalAllocated;

// Potencjalne oszczędności (sugestia)
const potentialSavings = Math.max(0, income - expensesSum);
```

**Stany UI:**

| Stan | Warunek | Kolor | Zapis |
|------|---------|-------|-------|
| Zbilansowany | `unassigned === 0` | Zielony | Aktywny |
| Do rozdysponowania | `unassigned > 0` | Amber | Aktywny |
| Przekroczenie | `unassigned < 0` | Rose | Zablokowany |

### 4.4 AddTransaction

**Plik:** `components/AddTransaction.tsx`

**Odpowiedzialności:**
- Dodawanie nowych wydatków
- Edycja istniejących (route `/edit/:id`)
- Usuwanie transakcji
- Obsługa zwrotów (ujemne kwoty)

**Logika typów transakcji:**

```typescript
// Wydatek = kwota dodatnia
// Zwrot = kwota ujemna (zapisana jako -amount)
const finalAmount = type === 'expense' ? Number(amount) : -Number(amount);
```

### 4.5 MonthReview (Statistics)

**Plik:** `components/MonthReview.tsx`

**Odpowiedzialności:**
- Wykres efektywności oszczędzania
- Wykres struktury wydatków (pie chart)
- Lista transakcji z filtrowaniem
- Edycja przez kliknięcie

---

## 5. Routing

### 5.1 Definicja tras

```typescript
<Routes>
  <Route path="/" element={<Layout />}>
    <Route index element={<Dashboard />} />
    <Route path="statistics" element={<Statistics />} />
  </Route>
  <Route path="/add" element={<AddTransaction />} />
  <Route path="/edit/:id" element={<AddTransaction />} />
  <Route path="/setup" element={<BudgetSetup />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

### 5.2 Uzasadnienie HashRouter

```
✓ HashRouter: example.com/#/setup
✗ BrowserRouter: example.com/setup

HashRouter pozwala na hosting statyczny bez konfiguracji serwera.
URL z hashem (#) działa na GitHub Pages, S3, Netlify bez redirects.
```

---

## 6. Persystencja

### 6.1 Strategia localStorage

**Klucz:** `spokoj-app-data-v1`

**Format:**

```json
{
  "currentMonthId": "2026-01",
  "configs": {
    "2026-01": {
      "id": "2026-01",
      "totalIncome": 15000,
      "savingsGoals": []
    }
  },
  "categories": [
    { "id": "1", "name": "Dom i Rachunki", "limit": 3000, "icon": "Home" },
    ...
  ],
  "transactions": [
    {
      "id": "abc-123",
      "amount": 45,
      "categoryId": "3",
      "date": "2026-01-15",
      "note": "Lunch",
      "createdBy": "Artur",
      "timestamp": 1705312800000
    },
    ...
  ]
}
```

### 6.2 Migracje

Obecna wersja zawiera migrację dla kategorii "savings":

```typescript
const hasSavings = categories.some((c: any) => c.id === 'savings');
if (!hasSavings) {
  const savingsCat = DEFAULT_CATEGORIES.find(c => c.id === 'savings');
  if (savingsCat) {
    categories = [...categories, savingsCat];
  }
}
```

### 6.3 Obsługa błędów

```typescript
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    // ... walidacja
  }
} catch (e) {
  console.error("Błąd odczytu danych:", e);
  // Fallback do stanu domyślnego
}
```

---

## 7. Formatowanie

### 7.1 Formatery walutowe

```typescript
// Formatowanie kwot (PLN, bez groszy)
export const CURRENCY_FORMATTER = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  maximumFractionDigits: 0,
});
// Wynik: "1 234 zł"

// Formatowanie procentów
export const PERCENTAGE_FORMATTER = new Intl.NumberFormat('pl-PL', {
  style: 'percent',
  maximumFractionDigits: 0,
});
// Wynik: "75%"
```

### 7.2 Formatowanie dat

```typescript
// ID miesiąca
export const getCurrentMonthId = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
// Wynik: "2026-01"

// Nazwa miesiąca
export const getMonthName = (monthId: string) => {
  const [year, month] = monthId.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
};
// Wynik: "styczeń 2026"
```

---

## 8. Stylowanie

### 8.1 Tailwind config

```javascript
// tailwind.config.js (domyślna konfiguracja)
// Rozszerzenia:
// - calm-blue: #4F46E5 (akcent główny)
// - calm-rose: #F43F5E (przekroczenia)
```

### 8.2 Klasy pomocnicze

```css
/* Animacja wejścia */
.animate-fade-in {
  animation: fadeIn 150ms ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Ukrycie scrollbara (iOS-style) */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
```

---

## 9. Bezpieczeństwo

### 9.1 Dane wrażliwe

| Ryzyko | Mitygacja |
|--------|-----------|
| Dane w localStorage | Nie przechowujemy danych bankowych, tylko sumy |
| XSS | React escapuje dane automatycznie |
| CSRF | Brak backendu = brak ryzyka |

### 9.2 Prywatność

- Brak telemetrii
- Brak zewnętrznych API (poza CDN dla bibliotek)
- Dane pozostają wyłącznie w przeglądarce użytkownika

---

## 10. Wydajność

### 10.1 Optymalizacje

| Technika | Zastosowanie |
|----------|--------------|
| `useMemo` | Obliczenia statystyk kategorii |
| Lazy loading | Brak (małą aplikacja, nie potrzebne) |
| Code splitting | Brak (całość < 100KB) |

### 10.2 Metryki

| Metryka | Cel | Aktualnie |
|---------|-----|-----------|
| First Contentful Paint | < 1.5s | ~0.8s |
| Time to Interactive | < 2s | ~1.2s |
| Bundle size (gzip) | < 100KB | ~60KB |

---

## 11. Testowanie (przyszłość)

### 11.1 Strategia testów

| Typ | Narzędzie | Pokrycie |
|-----|-----------|----------|
| Unit | Vitest | Helpery, formatery |
| Component | React Testing Library | Formularze, interakcje |
| E2E | Playwright | Kluczowe flow |

### 11.2 Przykładowe przypadki testowe

```typescript
// Unit: formatowanie
test('CURRENCY_FORMATTER formats PLN correctly', () => {
  expect(CURRENCY_FORMATTER.format(1234)).toBe('1 234 zł');
});

// Component: dodawanie wydatku
test('AddTransaction saves transaction on submit', async () => {
  render(<AddTransaction />);
  await userEvent.type(screen.getByPlaceholderText('0'), '45');
  await userEvent.click(screen.getByText('Jedzenie (Miasto)'));
  await userEvent.click(screen.getByText('Dodaj Wydatek'));
  // Weryfikacja zapisu w context
});

// E2E: pełny flow miesiąca
test('User can plan budget and add expenses', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Ustawienia Budżetu');
  // ... reszta flow
});
```

---

## 12. Deployment

### 12.1 Build produkcyjny

```bash
npm run build
# Wynik w dist/
```

### 12.2 Opcje hostingu

| Platforma | Konfiguracja |
|-----------|--------------|
| GitHub Pages | Automatyczny deploy z /dist |
| Netlify | Drag & drop /dist |
| Vercel | Import z GitHub |
| S3 + CloudFront | Upload /dist do S3 |

### 12.3 Zmienne środowiskowe

Brak — aplikacja jest w pełni statyczna.

---

## Changelog

| Wersja | Data | Zmiany |
|--------|------|--------|
| 1.0.0 | 2026-01 | Inicjalna wersja MVP |
