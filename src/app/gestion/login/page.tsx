"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("activo")
      .eq("id", data.user.id)
      .single();

    if (!perfil || !perfil.activo) {
      await supabase.auth.signOut();
      setError("Cuenta desactivada. Contactate con el administrador.");
      setLoading(false);
      return;
    }

    router.push("/gestion");
    router.refresh();
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#0a0a0a] px-4 text-[#efe9df]">
      <Image
        src="/norte-logo.jpg"
        alt="Norte Motorepuestos"
        width={100}
        height={100}
        priority
        className="mb-4 rounded-xl shadow-2xl shadow-black/60"
      />
      <h1 className="font-display text-center text-xl uppercase">Norte Motorepuestos</h1>
      <p className="mb-8 text-sm text-[#a89a89]">Panel de gestión</p>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-[#2a2216] bg-[#151109] px-4 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-[#2a2216] bg-[#151109] px-4 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          />
        </label>

        {error && <p className="text-sm font-semibold text-[#d62828]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-[#f2891f] px-4 py-2 text-sm font-bold text-[#0a0a0a] transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
