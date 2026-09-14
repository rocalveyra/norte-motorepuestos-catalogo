"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PagoRow {
  key: string;
  formaPagoId: string;
  cuentaId: string;
  monto: string;
}

interface Opcion {
  id: string;
  nombre: string;
}

export function nuevaFilaPago(): PagoRow {
  return { key: crypto.randomUUID(), formaPagoId: "", cuentaId: "", monto: "" };
}

export function parseMonto(raw: string): number | null {
  const n = parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function sumaPagos(filas: PagoRow[]): number {
  return filas.reduce((acc, f) => acc + (parseMonto(f.monto) ?? 0), 0);
}

export function pagosCompletos(filas: PagoRow[]): boolean {
  return (
    filas.length > 0 &&
    filas.every((f) => {
      const monto = parseMonto(f.monto);
      return f.formaPagoId !== "" && f.cuentaId !== "" && monto !== null && monto > 0;
    })
  );
}

export default function PagosSelector({
  filas,
  onChange,
  total,
}: {
  filas: PagoRow[];
  onChange: (filas: PagoRow[]) => void;
  total: number;
}) {
  const [formasPago, setFormasPago] = useState<Opcion[]>([]);
  const [cuentas, setCuentas] = useState<Opcion[]>([]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [{ data: fp }, { data: c }] = await Promise.all([
        supabase.from("formas_pago").select("id, nombre").eq("activa", true).order("orden"),
        supabase.from("cuentas").select("id, nombre").eq("activa", true).order("orden"),
      ]);
      setFormasPago((fp as Opcion[]) ?? []);
      setCuentas((c as Opcion[]) ?? []);
    })();
  }, []);

  function actualizarFila(key: string, cambios: Partial<PagoRow>) {
    onChange(filas.map((f) => (f.key === key ? { ...f, ...cambios } : f)));
  }

  function quitarFila(key: string) {
    onChange(filas.filter((f) => f.key !== key));
  }

  const suma = sumaPagos(filas);
  const coincide = Math.abs(suma - total) < 0.01;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
        Forma de pago y cuenta
      </label>
      {filas.map((fila) => (
        <div key={fila.key} className="flex flex-wrap items-center gap-2">
          <select
            value={fila.formaPagoId}
            onChange={(e) => actualizarFila(fila.key, { formaPagoId: e.target.value })}
            className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          >
            <option value="">Forma de pago...</option>
            {formasPago.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
          <select
            value={fila.cuentaId}
            onChange={(e) => actualizarFila(fila.key, { cuentaId: e.target.value })}
            className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          >
            <option value="">Cuenta...</option>
            {cuentas.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="decimal"
            value={fila.monto}
            onChange={(e) => actualizarFila(fila.key, { monto: e.target.value })}
            placeholder="Monto"
            className="w-28 rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          />
          {filas.length > 1 && (
            <button
              type="button"
              onClick={() => quitarFila(fila.key)}
              className="text-xs font-semibold text-[#d62828] hover:underline"
            >
              Quitar
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...filas, nuevaFilaPago()])}
        className="self-start text-xs font-semibold text-[#f2891f] hover:underline"
      >
        + Agregar otra forma de pago
      </button>
      <p className={`text-xs font-semibold ${coincide ? "text-[#7cb464]" : "text-[#d62828]"}`}>
        Pagos cargados: ${suma.toLocaleString("es-AR")} / Total: ${total.toLocaleString("es-AR")}
        {!coincide && " — no coincide con el total"}
      </p>
    </div>
  );
}
