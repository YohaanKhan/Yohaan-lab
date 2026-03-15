"use client";

import { useState } from "react";
import { signUp } from "@/lib/auth";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await signUp(email, password, username);
      setSuccess(true); // show confirmation message — email needs to be verified
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm p-8 sm:p-10 bg-surface border border-border rounded-xl shadow-2xl text-center">
          <div className="text-2xl mb-3">📬</div>
          <h1 className="font-sans text-xl font-semibold text-primary mb-2">Check your email</h1>
          <p className="font-mono text-xs text-muted">
            We sent a confirmation link to <span className="text-primary">{email}</span>.
            Click it to activate your account, then come back to sign in.
          </p>
          <a
            href="/login"
            className="inline-block mt-6 px-4 py-2 rounded-md bg-accent text-white font-sans text-sm font-medium hover:opacity-90 transition-opacity duration-200"
          >
            Go to Login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm p-8 sm:p-10 bg-surface border border-border rounded-xl shadow-2xl">
        <div className="mb-8">
          <h1 className="font-sans text-2xl font-semibold text-primary mb-1">
            Create account
          </h1>
          <p className="font-mono text-xs text-muted">
            Join the community
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-wider text-muted px-1">Username</label>
            <input
              type="text"
              placeholder="johndoe"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-md bg-background border border-border text-primary font-sans text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors duration-200"
            />
          </div>

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
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="font-mono text-xs text-muted text-center pt-2">
            Already have an account?{" "}
            <a href="/login" className="text-accent hover:underline transition-all">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}