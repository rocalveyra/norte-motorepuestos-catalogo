"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Proveedor {
  id: string;
  nombre: string;
  contacto: string | null;
  email: string;
  direccion: string;
  notas: string | null;
}

export default function ProveedorFormModal({
  proveedor,
  onClose,
  onGuardado,
}: {
  proveedor: Proveedor | null;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(proveedor?.nombre ?? "");
  const [contacto, setContacto] = useState(proveedor?.contacto ?? "");
  const [email, setEmail] = useState(proveedor?.email ?? "");
  const [direccion, setDireccion] = useState(proveedor?.direccion ?? "");
  const [notas, setNotas] = useState(proveedor?.notas ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (!nombre.trim() || !email.trim() || !direccion.trim()) {
      setError("Nombre, email y dirección son obligatorios.");
      return;
    }
    setGuardando(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      nombre: nombre.trim(),
      contacto: contacto.trim() || null,
      email: email.trim(),
      direccion: direccion.trim(),
      notas: notas.trim() || null,
    };
    const { error: err } = proveedor
      ? await supabase.from("proveedores").update(payload).eq("id", proveedor.id)
      : await supabase.from("proveedores").insert(payload);
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
            {proveedor ? "Editar proveedor" : "Proveedor nuevo"}
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
              Contacto (opcional)
            </label>
            <input
              type="text"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              placeholder="Teléfono, referente, etc."
              className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Dirección
            </label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
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
