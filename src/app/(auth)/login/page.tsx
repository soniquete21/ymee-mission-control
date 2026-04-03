"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="panel rounded-2xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--accent)" }}>
          Mission Control
        </h1>
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          Sign in to your workspace
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            defaultValue="highrez@missioncontrol.local"
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
            defaultValue="mission2024"
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
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: "var(--muted)" }}>
        No account?{" "}
        <a href="/register" style={{ color: "var(--accent)" }}>
          Register
        </a>
      </p>
    </div>
  );
}
