import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

// Lista dozwolonych emaili - tylko te osoby mogą się zalogować
const ALLOWED_EMAILS = [
  'choinski.art@gmail.com',
  'marlenaoza@gmail.com',
];

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAllowed: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser?.email) {
        const allowed = ALLOWED_EMAILS.includes(firebaseUser.email.toLowerCase());
        setIsAllowed(allowed);

        if (!allowed) {
          setError(`Email ${firebaseUser.email} nie ma dostępu do tej aplikacji.`);
          // Auto-logout nieautoryzowanych użytkowników
          firebaseSignOut(auth);
        } else {
          setError(null);
        }
      } else {
        setIsAllowed(false);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email?.toLowerCase();

      if (email && !ALLOWED_EMAILS.includes(email)) {
        setError(`Email ${email} nie ma dostępu do tej aplikacji. Skontaktuj się z administratorem.`);
        await firebaseSignOut(auth);
        setIsAllowed(false);
      } else {
        setIsAllowed(true);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Logowanie anulowane.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup został zablokowany. Odblokuj popupy dla tej strony.');
      } else {
        setError('Wystąpił błąd podczas logowania. Spróbuj ponownie.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setIsAllowed(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAllowed, error, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
