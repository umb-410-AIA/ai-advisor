
/*
Source: ChatGPT
Prompt:

I'm creating an authentication system for a react app that has dead simple authentication. The user will provide a special key, and if that key matches the key on the server (stored as a secret), then the user will be given a signed JWT that they will have to send with all requests. Write me a typescript react context called AuthContext that will do the following things

1. Provide a function that, given a user-provided password argument, will attempt to get a new JWT
2. Keep track of the JWT in a useState, or keep it null if the user is not authenticated

*/

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * AuthContext
 * - Keeps a JWT in React state (null if unauthenticated)
 * - Exposes a function `login(password)` that requests a new JWT from the server
 * - Also exposes `logout()` and a convenience boolean `isAuthenticated`
 *
 * Assumptions:
 * - Your server exposes POST /api/auth/login that accepts `{ password: string }`
 *   and returns `{ token: string }` on success.
 */

type LoginFn = (password: string) => Promise<void>;

type AuthContextValue = {
  token: string | null;
  isAuthenticated: boolean;
  login: LoginFn;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_STORAGE_KEY = "auth_token";

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);

  // Load token once from storage (if present)
  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (stored) setToken(stored);
  }, []);

  const login = useCallback<LoginFn>(async (password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      // You can refine error handling based on your API's error shape
      throw new Error("Authentication failed. Check the password and try again.");
    }

    const data = (await res.json()) as { token: string };
    if (!data?.token) {
      throw new Error("Login response did not include a token.");
    }

    setToken(data.token);
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    } catch {
      // Ignore storage write errors (e.g., in private mode)
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    token,
    isAuthenticated: Boolean(token),
    login,
    logout,
  }), [token, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export default AuthContext;
