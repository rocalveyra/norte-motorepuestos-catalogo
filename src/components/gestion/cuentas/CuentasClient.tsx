"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Item {
  id: string;
  nombre: string;
  activa: boolean;
  orden: number;
}

function Catalogo({
  titulo,
  tabla,
}: {
  titulo: string;
  tabla: "formas_pago" | "cuentas";
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    const supabase = createClient();
    const { data } = await supabase.from(tabla).select("id, nombre, activa, orden").order("orden");
    setItems((data as Item[]) ?? []);
    setCargando(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function agregar() {
    if (!nuevoNombre.trim()) return;
    setGuardando(true);
    setError(null);
    const supabase = createClient();
    const siguienteOrden = items.length > 0 ? Math.max(...items.map((i) => i.orden)) + 1 : 1;
    const { error: err } = await supabase
      .from(tabla)
      .insert({ nombre: nuevoNombre.trim(), orden: siguienteOrden });
    setGuardando(false);
    if (err) {
      setError(err.message);
      return;
    }
    setNuevoNombre("");
    cargar();
  }

  async function toggleActiva(item: Item) {
    const supabase = createClient();
    await supabase.from(tabla).update({ activa: !item.activa }).eq("id", item.id);
    cargar();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#2a2216] bg-[#151109] p-4">
      <h2 className="font-display text-lg uppercase text-[#efe9df]">{titulo}</h2>
      {cargando ? (
        <p className="text-sm text-[#a89a89]">Cargando...</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-[#2a2216] px-3 py-2"
            >
              <span className={item.activa ? "text-[#efe9df]" : "text-[#a89a89] line-through"}>
                {item.nombre}
              </span>
              <button
                type="button"
                onClick={() => toggleActiva(item)}
                className={`text-xs font-semibold hover:underline ${
                  item.activa ? "text-[#d62828]" : "text-[#7cb464]"
                }`}
              >
                {item.activa ? "Desactivar" : "Activar"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder="Nombre nuevo..."
          className="flex-1 rounded-lg border border-[#2a2216] bg-[#0a0a0a] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
        />
        <button
          type="button"
          disabled={guardando || !nuevoNombre.trim()}
          onClick={agregar}
          className="rounded-lg bg-[#f2891f] px-4 py-2 text-xs font-bold text-[#0a0a0a] disabled:opacity-40"
        >
          {guardando ? "Guardando..." : "Agregar"}
        </button>
      </div>
      {error && <p className="text-xs font-semibold text-[#d62828]">{error}</p>}
    </div>
  );
}

export default function CuentasClient() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl uppercase text-[#efe9df]">Cuentas</h1>
        <p className="text-sm text-[#a89a89]">
          Formas de pago y cuentas disponibles al cargar un movimiento. Desactivar no borra el
          historial.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Catalogo titulo="Formas de pago" tabla="formas_pago" />
        <Catalogo titulo="Cuentas" tabla="cuentas" />
      </div>
    </div>
  );
}
