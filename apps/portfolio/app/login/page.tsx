"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm p-8 sm:p-10 bg-surface border border-border rounded-xl shadow-2xl">
        <div className="mb-8">
          <h1 className="font-sans text-2xl font-semibold text-primary mb-1">
            Sign in
          </h1>
          <p className="font-mono text-xs text-muted">
            Enter your credentials to continue
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-wider text-muted px-1">Email</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-md bg-background border border-border text-primary font-sans text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors duration-200"
            />
          </div>
          
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-wider text-muted px-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-md bg-background border border-border text-primary font-sans text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors duration-200"
            />
          </div>

          {error && (
            <p className="font-mono text-xs text-red-400 bg-red-400/10 py-2 px-3 rounded border border-red-400/20">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 mt-2 rounded-md bg-accent text-white font-sans text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="font-mono text-xs text-muted text-center pt-2">
            No account?{" "}
            <a href="/register" className="text-accent hover:underline transition-all">
              Register
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}