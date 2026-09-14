"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ProveedorOpcion {
  id: string;
  nombre: string;
}

export default function VincularProveedorInline({
  productoId,
  idsExcluir,
  esPreferido,
  onVinculado,
}: {
  productoId: string;
  idsExcluir: string[];
  esPreferido: boolean;
  onVinculado: () => void;
}) {
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState<ProveedorOpcion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (termino.trim().length < 2) {
      return;
    }
    const supabase = createClient();
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("proveedores")
        .select("id, nombre")
        .ilike("nombre", `%${termino}%`)
        .limit(8);
      setResultados(((data as ProveedorOpcion[]) ?? []).filter((p) => !idsExcluir.includes(p.id)));
      setAbierto(true);
    }, 250);
    return () => clearTimeout(timeout);
  }, [termino, idsExcluir]);

  async function vincular(proveedorId: string) {
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("producto_proveedores")
      .insert({ producto_id: productoId, proveedor_id: proveedorId, es_preferido: esPreferido });
    if (err) {
      setError(err.message);
      return;
    }
    setTermino("");
    setResultados([]);
    setAbierto(false);
    onVinculado();
  }

  async function crearYVincular() {
    if (!nombre.trim() || !email.trim() || !direccion.trim()) {
      setError("Nombre, email y dirección son obligatorios.");
      return;
    }
    setGuardando(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("proveedores")
      .insert({ nombre: nombre.trim(), email: email.trim(), direccion: direccion.trim() })
      .select("id")
      .single();
    if (err || !data) {
      setGuardando(false);
      setError(err?.message ?? "No se pudo crear el proveedor.");
      return;
    }
    await vincular(data.id);
    setGuardando(false);
    setCreando(false);
    setNombre("");
    setEmail("");
    setDireccion("");
  }

  if (creando) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-[#2a2216] bg-[#151109] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#f7c948]">
          Proveedor nuevo
        </p>
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-lg border border-[#2a2216] bg-[#0a0a0a] px-3 py-1.5 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
        />
        <input
          type="text"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-[#2a2216] bg-[#0a0a0a] px-3 py-1.5 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
        />
        <input
          type="text"
          placeholder="Dirección"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          className="rounded-lg border border-[#2a2216] bg-[#0a0a0a] px-3 py-1.5 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
        />
        {error && <p className="text-xs font-semibold text-[#d62828]">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={guardando}
            onClick={crearYVincular}
            className="rounded-lg bg-[#f2891f] px-3 py-1.5 text-xs font-bold text-[#0a0a0a] disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Guardar y vincular"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCreando(false);
              setError(null);
            }}
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
        value={termino}
        onChange={(e) => {
          const v = e.target.value;
          setTermino(v);
          if (v.trim().length < 2) setResultados([]);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar proveedor existente..."
        className="w-full rounded-lg border border-[#2a2216] bg-[#151109] px-4 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
      />
      {error && <p className="mt-1 text-xs font-semibold text-[#d62828]">{error}</p>}
      {abierto && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#2a2216] bg-[#151109] shadow-xl">
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => vincular(p.id)}
                className="flex w-full flex-col items-start px-4 py-2 text-left text-sm hover:bg-[#1c1712]"
              >
                <span className="font-medium text-[#efe9df]">{p.nombre}</span>
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
              + Proveedor nuevo
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
