# Firebase Setup - Zabezpieczenie aplikacji

## 1. Włącz Google Sign-In w Firebase Console

1. Wejdź na https://console.firebase.google.com
2. Wybierz projekt `budgeting-app-3decf`
3. Przejdź do **Authentication** (w menu po lewej)
4. Kliknij zakładkę **Sign-in method**
5. Kliknij **Google** i włącz tę metodę
6. Podaj nazwę projektu (np. "Twój Spokój")
7. Wybierz email do supportu
8. Kliknij **Save**

## 2. Dodaj domenę GitHub Pages do autoryzowanych domen

1. W sekcji **Authentication** kliknij **Settings** (koło zębate)
2. Przejdź do zakładki **Authorized domains**
3. Dodaj domenę: `choinskiart.github.io`

## 3. Zaktualizuj reguły Firestore (WAŻNE!)

1. Przejdź do **Firestore Database** w menu
2. Kliknij zakładkę **Rules**
3. Zamień obecne reguły na poniższe:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Lista dozwolonych emaili - ZMIEŃ NA SWOJE!
    function isAllowedUser() {
      return request.auth != null &&
             request.auth.token.email in [
               'artur.choinski@gmail.com',    // Zmień na swój email
               'marlena@example.com'          // Zmień na email Marleny
             ];
    }

    // Zablokuj dostęp do wszystkiego domyślnie
    match /{document=**} {
      allow read, write: if false;
    }

    // Pozwól autoryzowanym użytkownikom na dostęp do danych budżetu
    match /households/{householdId}/data/{document=**} {
      allow read, write: if isAllowedUser();
    }
  }
}
```

4. Kliknij **Publish**

## 4. Zaktualizuj listę dozwolonych emaili w kodzie

Edytuj plik `context/AuthContext.tsx` i zmień listę `ALLOWED_EMAILS`:

```typescript
const ALLOWED_EMAILS = [
  'twoj.email@gmail.com',      // Twój prawdziwy email
  'marlena.email@gmail.com',   // Email Marleny
];
```

## Gotowe!

Po wykonaniu tych kroków:
- Tylko Ty i Marlena będziecie mogli się zalogować
- Dane są chronione na poziomie bazy danych Firebase
- Osoby trzecie nie będą miały dostępu nawet jeśli poznają URL aplikacji
