/*
Source: ChatGPT
Prompt:

Now, write me a really simple login Next.js route that has a field for the universal password and nothing more. It should attempt to authenticate when the user submits, and if successful, reroute to '/'

*/
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('Attempting login...');
      await login(password);
      console.log('Login successful, redirecting...');
      router.push("/");
    } catch (err) {
      console.error('Login error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (isAuthenticated) {
    router.replace("/");
    return null;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-xl shadow-md bg-white flex flex-col gap-4 w-80"
      >
        <h1 className="text-xl font-semibold text-center">Login</h1>

        <input
          type="password"
          placeholder="Enter access key"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
          required
        />

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Authenticating..." : "Login"}
        </button>
      </form>
    </div>
  );
}
