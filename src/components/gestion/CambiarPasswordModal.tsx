"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CambiarPasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function guardar() {
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
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setGuardando(false);
    if (err) {
      setError(err.message);
      return;
    }
    setExito(true);
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
          <h3 className="font-display text-lg uppercase text-[#efe9df]">Cambiar contraseña</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#2a2216] px-2 py-1 text-sm"
          >
            ✕
          </button>
        </div>

        {exito ? (
          <div className="flex flex-col gap-3">
            <p className="rounded-lg border border-[#7cb464] bg-[#7cb464]/10 px-4 py-2 text-sm font-semibold text-[#7cb464]">
              Contraseña actualizada correctamente.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="self-start rounded-lg border border-[#2a2216] px-5 py-2 text-sm font-semibold text-[#efe9df]"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
                Contraseña nueva
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
              />
            </div>
            {error && <p className="text-xs font-semibold text-[#d62828]">{error}</p>}
            <button
              type="button"
              disabled={guardando}
              onClick={guardar}
              className="self-start rounded-lg bg-[#f2891f] px-5 py-2 text-sm font-bold text-[#0a0a0a] disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
