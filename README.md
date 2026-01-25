# Twój Spokój

Aplikacja do planowania budżetu domowego dla par, której celem jest spokój, jasność i świadomość finansowa.

## Filozofia

- **Spokój, nie kontrola** — brak gamifikacji, streaków, porównań
- **Świadomość, nie automatyzacja** — ręczne wpisywanie buduje nawyk
- **Wspólnota, nie rywalizacja** — jeden wspólny budżet
- **Sygnały, nie blokady** — przekroczenie to informacja, nie porażka

## Uruchomienie lokalne

**Wymagania:** Node.js 18+

```bash
npm install
npm run dev
```

Aplikacja uruchomi się pod adresem `http://localhost:5173`

## Stack technologiczny

- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router v6
- Recharts
- Lucide Icons

## Dokumentacja

Szczegółowa dokumentacja projektowa znajduje się w katalogu `/docs`:

| Dokument | Opis |
|----------|------|
| [DESIGN.md](docs/DESIGN.md) | Kompleksowa dokumentacja projektowa — filozofia, architektura, modele danych, flow użytkownika |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architektura techniczna — diagramy, komponenty, persystencja |
| [UX-GUIDELINES.md](docs/UX-GUIDELINES.md) | Wytyczne UX — ton komunikacji, kolorystyka, anty-wzorce |

## Struktura projektu

```
src/
├── components/
│   ├── ui/               # Komponenty bazowe
│   ├── Dashboard.tsx     # Główny widok
│   ├── BudgetSetup.tsx   # Planowanie miesiąca
│   ├── AddTransaction.tsx # Dodawanie wydatków
│   ├── MonthReview.tsx   # Statystyki
│   └── Layout.tsx        # Shell nawigacyjny
├── context/
│   └── BudgetContext.tsx # Stan globalny
├── types.ts              # Definicje TypeScript
├── constants.ts          # Formatery, helpery
└── App.tsx               # Router
```

## Licencja

Projekt prywatny.
