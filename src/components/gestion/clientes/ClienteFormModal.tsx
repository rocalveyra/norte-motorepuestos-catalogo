"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  dni: string | null;
  direccion: string | null;
}

export default function ClienteFormModal({
  cliente,
  onClose,
  onGuardado,
}: {
  cliente: Cliente | null;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(cliente?.nombre ?? "");
  const [telefono, setTelefono] = useState(cliente?.telefono ?? "");
  const [dni, setDni] = useState(cliente?.dni ?? "");
  const [direccion, setDireccion] = useState(cliente?.direccion ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setGuardando(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      dni: dni.trim() || null,
      direccion: direccion.trim() || null,
    };
    const { error: err } = cliente
      ? await supabase.from("clientes").update(payload).eq("id", cliente.id)
      : await supabase.from("clientes").insert(payload);
    setGuardando(false);
    if (err) {
      setError(err.message);
      return;
    }
    onGuardado();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[#2a2216] bg-[#111111] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="font-display text-lg uppercase text-[#efe9df]">
            {cliente ? "Editar cliente" : "Cliente nuevo"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#2a2216] px-2 py-1 text-sm"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Teléfono (opcional)
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              DNI (opcional)
            </label>
            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Dirección (opcional)
            </label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
            />
          </div>
          {error && <p className="text-xs font-semibold text-[#d62828]">{error}</p>}
          <button
            type="button"
            disabled={guardando}
            onClick={guardar}
            className="mt-1 self-start rounded-lg bg-[#f2891f] px-5 py-2 text-sm font-bold text-[#0a0a0a] disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
