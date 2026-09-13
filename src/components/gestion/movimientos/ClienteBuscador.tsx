"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ClienteResultado {
  id: string;
  nombre: string;
  telefono: string | null;
}

export default function ClienteBuscador({
  cliente,
  onSelect,
}: {
  cliente: ClienteResultado | null;
  onSelect: (c: ClienteResultado | null) => void;
}) {
  const [term, setTerm] = useState("");
  const [resultados, setResultados] = useState<ClienteResultado[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  useEffect(() => {
    if (cliente || term.trim().length < 2) {
      return;
    }
    const supabase = createClient();
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nombre, telefono")
        .or(`nombre.ilike.%${term}%,telefono.ilike.%${term}%`)
        .limit(8);
      setResultados((data as ClienteResultado[]) ?? []);
      setAbierto(true);
    }, 250);
    return () => clearTimeout(timeout);
  }, [term, cliente]);

  async function crearCliente() {
    if (!nuevoNombre.trim()) {
      setErrorCrear("El nombre es obligatorio.");
      return;
    }
    setGuardando(true);
    setErrorCrear(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("clientes")
      .insert({ nombre: nuevoNombre.trim(), telefono: nuevoTelefono.trim() || null })
      .select("id, nombre, telefono")
      .single();
    setGuardando(false);
    if (error || !data) {
      setErrorCrear(error?.message ?? "No se pudo crear el cliente.");
      return;
    }
    onSelect(data);
    setCreando(false);
    setNuevoNombre("");
    setNuevoTelefono("");
  }

  if (cliente) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-[#2a2216] bg-[#151109] px-4 py-2">
        <div>
          <p className="text-sm font-semibold text-[#efe9df]">{cliente.nombre}</p>
          {cliente.telefono && <p className="text-xs text-[#a89a89]">{cliente.telefono}</p>}
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setTerm("");
            setResultados([]);
            setAbierto(false);
          }}
          className="text-xs font-semibold text-[#d62828] hover:underline"
        >
          Quitar
        </button>
      </div>
    );
  }

  if (creando) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-[#2a2216] bg-[#151109] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#f7c948]">Cliente nuevo</p>
        <input
          type="text"
          placeholder="Nombre"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          className="rounded-lg border border-[#2a2216] bg-[#0a0a0a] px-3 py-1.5 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
        />
        <input
          type="text"
          placeholder="Teléfono (opcional)"
          value={nuevoTelefono}
          onChange={(e) => setNuevoTelefono(e.target.value)}
          className="rounded-lg border border-[#2a2216] bg-[#0a0a0a] px-3 py-1.5 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
        />
        {errorCrear && <p className="text-xs font-semibold text-[#d62828]">{errorCrear}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={guardando}
            onClick={crearCliente}
            className="rounded-lg bg-[#f2891f] px-3 py-1.5 text-xs font-bold text-[#0a0a0a] disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Guardar cliente"}
          </button>
          <button
            type="button"
            onClick={() => setCreando(false)}
            className="rounded-lg border border-[#2a2216] px-3 py-1.5 text-xs font-semibold text-[#efe9df]"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={term}
        onChange={(e) => {
          const v = e.target.value;
          setTerm(v);
          if (v.trim().length < 2) setResultados([]);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar cliente por nombre o teléfono (opcional)..."
        className="w-full rounded-lg border border-[#2a2216] bg-[#151109] px-4 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
      />
      {abierto && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#2a2216] bg-[#151109] shadow-xl">
          {resultados.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(c);
                  setAbierto(false);
                }}
                className="flex w-full flex-col items-start px-4 py-2 text-left text-sm hover:bg-[#1c1712]"
              >
                <span className="font-medium text-[#efe9df]">{c.nombre}</span>
                {c.telefono && <span className="text-xs text-[#a89a89]">{c.telefono}</span>}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                setCreando(true);
                setAbierto(false);
              }}
              className="w-full px-4 py-2 text-left text-sm font-semibold text-[#f2891f] hover:bg-[#1c1712]"
            >
              + Agregar cliente nuevo
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
