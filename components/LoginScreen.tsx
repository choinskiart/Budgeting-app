import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const { signInWithGoogle, isLoading, error } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl border border-neutral-100 p-8 max-w-sm w-full text-center">
        {/* Logo/Icon */}
        <div className="w-16 h-16 bg-calm-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8 text-calm-blue" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-neutral-800 mb-2">Twój Spokój</h1>
        <p className="text-neutral-500 text-sm mb-8">
          Aplikacja do zarządzania budżetem domowym
        </p>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          onClick={signInWithGoogle}
          disabled={isLoading}
          className="w-full py-3.5 px-6 bg-white border-2 border-neutral-200 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {/* Google Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Zaloguj przez Google
            </>
          )}
        </button>

        {/* Info */}
        <p className="text-xs text-neutral-400 mt-6">
          Dostęp tylko dla autoryzowanych użytkowników.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
