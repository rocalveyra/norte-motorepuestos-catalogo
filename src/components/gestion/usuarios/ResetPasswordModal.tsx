"use client";

import { useState } from "react";

export default function ResetPasswordModal({
  usuarioId,
  usuarioNombre,
  onClose,
  onListo,
}: {
  usuarioId: string;
  usuarioNombre: string;
  onClose: () => void;
  onListo: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setGuardando(true);
    setError(null);
    const res = await fetch(`/api/admin/usuarios/${usuarioId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo actualizar la contraseña.");
      return;
    }
    onListo();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[#2a2216] bg-[#111111] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="font-display text-lg uppercase text-[#efe9df]">Resetear contraseña</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#2a2216] px-2 py-1 text-sm"
          >
            ✕
          </button>
        </div>
        <p className="mb-3 text-sm text-[#a89a89]">
          Nueva contraseña para <span className="font-semibold text-[#efe9df]">{usuarioNombre}</span>
        </p>
        <div className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Contraseña nueva"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          />
          {error && <p className="text-xs font-semibold text-[#d62828]">{error}</p>}
          <button
            type="button"
            disabled={guardando}
            onClick={confirmar}
            className="self-start rounded-lg bg-[#f2891f] px-5 py-2 text-sm font-bold text-[#0a0a0a] disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Actualizar contraseña"}
          </button>
        </div>
      </div>
    </div>
  );
}
