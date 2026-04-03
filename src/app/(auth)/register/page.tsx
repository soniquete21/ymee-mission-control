"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed");
      setLoading(false);
    } else {
      router.push("/login");
    }
  }

  return (
    <div className="panel rounded-2xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--accent)" }}>
          Create Account
        </h1>
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          Join Mission Control
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
            Name
          </label>
          <input
            name="name"
            type="text"
            required
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--panel-strong)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--panel-strong)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--panel-strong)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity"
          style={{
            background: "var(--accent)",
            color: "#fff",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: "var(--muted)" }}>
        Already have an account?{" "}
        <a href="/login" style={{ color: "var(--accent)" }}>
          Sign in
        </a>
      </p>
    </div>
  );
}
