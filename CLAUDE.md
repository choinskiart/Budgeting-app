# CLAUDE.md - AI Assistant Guide for Budgeting App

## Project Overview

**Spokój - Domowy Budżet** (Polish: "Peace - Home Budget") is a zero-based budgeting application for couples built with React, TypeScript, and Vite. The app allows two partners (Artur & Marlena) to track shared household expenses, set category budgets, and monitor savings goals.

## Quick Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 3000)
npm run build        # Production build → dist/
npm run preview      # Preview production build
```

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.3 | UI framework with hooks |
| TypeScript | ~5.8.2 | Type safety |
| Vite | 6.2.0 | Build tool & dev server |
| React Router DOM | 7.12.0 | Client-side routing (HashRouter) |
| Tailwind CSS | 3.x | Utility-first styling (CDN) |
| Recharts | 3.6.0 | Data visualization |
| Lucide React | 0.562.0 | Icons |

## Project Structure

```
Budgeting-app/
├── components/              # React UI components
│   ├── ui/
│   │   └── ProgressBar.tsx  # Reusable progress bar
│   ├── AddTransaction.tsx   # Transaction form (add/edit)
│   ├── BudgetSetup.tsx      # Budget planning wizard
│   ├── Dashboard.tsx        # Main dashboard view
│   ├── Layout.tsx           # Navigation (desktop sidebar + mobile bottom nav)
│   └── MonthReview.tsx      # Statistics & analytics
├── context/
│   └── BudgetContext.tsx    # Global state management (Context API)
├── App.tsx                  # Root component with routing
├── index.tsx                # React entry point
├── types.ts                 # TypeScript type definitions
├── constants.ts             # Utility functions & formatters
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── index.html               # HTML template with Tailwind CDN
```

## Architecture Patterns

### State Management
- **React Context API** with `BudgetContext` for global state
- **localStorage persistence** with key `spokoj-app-data-v1`
- Access state via `useBudget()` custom hook
- State includes: transactions, categories, monthConfigs, savingsGoals

### Routing
- Uses **HashRouter** (`/#/path` format) for static hosting compatibility
- Routes:
  - `/` → Dashboard
  - `/statistics` → MonthReview
  - `/add` → AddTransaction (new)
  - `/edit/:id` → AddTransaction (edit mode)
  - `/setup` → BudgetSetup

### Component Patterns
- Functional components only (no class components)
- Custom hooks for shared logic
- `useMemo()` for expensive calculations
- Mobile-first responsive design with Tailwind breakpoints

## Key Types (types.ts)

```typescript
interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  date: string;           // YYYY-MM-DD
  note?: string;
  createdBy: 'Artur' | 'Marlena';
  timestamp: number;
}

interface Category {
  id: string;
  name: string;
  limit: number;
  icon: string;
}

interface MonthConfig {
  monthId: string;        // YYYY-MM format
  income: number;
  savingsTarget: number;
  categoryLimits: Record<string, number>;
}
```

## Code Conventions

### Naming
- **Components**: PascalCase (`Dashboard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useBudget`)
- **Types/Interfaces**: PascalCase (`Transaction`, `AppState`)
- **Constants**: UPPER_SNAKE_CASE (`CURRENCY_FORMATTER`)
- **Files**: PascalCase for components, camelCase for utilities

### Styling
- Use **Tailwind CSS utility classes** inline
- Custom color palette defined in `index.html`:
  - `calm-blue` - Primary actions
  - `calm-green` - Success/income
  - `calm-amber` - Warnings (75-99% budget)
  - `calm-rose` - Errors/overspent
- Neutral color system for text and backgrounds

### Language
- **UI text is in Polish** - maintain Polish for all user-facing strings
- Code comments and variable names in English

### Date/Time Formats
- Month ID: `YYYY-MM` (e.g., "2026-01")
- Date: `YYYY-MM-DD` (e.g., "2026-01-25")
- Use `getCurrentMonthId()` from constants.ts

### Currency
- Use `CURRENCY_FORMATTER` from constants.ts for PLN display
- Amounts stored as numbers (no currency symbols in data)

## Business Logic

### Zero-Based Budgeting
- All income must be allocated to expense categories or savings
- "Unassigned" amount shown in BudgetSetup when budget doesn't balance
- Categories have limits that reset monthly

### Transaction Types
- **Expense**: Negative impact on category budget
- **Return/Refund**: Positive (reduces spent amount)
- Both tagged with creator (Artur or Marlena)

### Category System
- 8 default categories defined in `DEFAULT_CATEGORIES` (types.ts)
- Special "savings" category always sorted last in Dashboard
- Category limits configurable per month

### Progress Bar Color Logic
- Blue (0-74%): Normal spending
- Amber (75-99%): Warning threshold
- Rose (100%+): Overspent

## Environment Variables

```bash
# .env.local
GEMINI_API_KEY=your_api_key_here
```

Accessed in code as `process.env.GEMINI_API_KEY` (injected via vite.config.ts)

## Important Files for Common Tasks

| Task | File(s) |
|------|---------|
| Add new route | `App.tsx` |
| Modify global state | `context/BudgetContext.tsx` |
| Add new type | `types.ts` |
| Update navigation | `components/Layout.tsx` |
| Add utility function | `constants.ts` |
| Modify build config | `vite.config.ts` |

## Testing

**Status**: No testing framework configured yet.

**Recommended**: Add Vitest for unit and component testing:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

## Common Pitfalls

1. **localStorage key**: Always use `spokoj-app-data-v1` for data persistence
2. **Month format**: Use `YYYY-MM` format consistently for monthId
3. **HashRouter**: Remember URLs use `/#/` prefix (required for static hosting)
4. **Polish UI**: All user-facing strings must remain in Polish
5. **Tailwind CDN**: Styles are loaded via CDN, not built locally
6. **Path aliases**: Use `@/` for root imports (configured in tsconfig.json and vite.config.ts)

## Git Workflow

- Main development on feature branches
- Commit messages in English with conventional format
- Keep commits focused and atomic

## Performance Considerations

- Use `useMemo()` for computed values (category totals, sorted lists)
- Avoid unnecessary re-renders by proper dependency arrays
- localStorage writes happen on every state change (batching not implemented)

## Future Considerations

- Add testing infrastructure (Vitest recommended)
- Consider migrating Tailwind from CDN to build step
- Add error boundaries for better error handling
- Consider data export/import functionality
- Multi-language support (currently Polish only)
