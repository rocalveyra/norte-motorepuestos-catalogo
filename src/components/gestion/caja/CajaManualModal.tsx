"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PagosSelector, {
  nuevaFilaPago,
  pagosCompletos,
  parseMonto,
  sumaPagos,
  type PagoRow,
} from "@/components/gestion/movimientos/PagosSelector";

export default function CajaManualModal({
  tipo,
  onClose,
  onGuardado,
}: {
  tipo: "ingreso" | "egreso";
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [descripcion, setDescripcion] = useState("");
  const [totalStr, setTotalStr] = useState("");
  const [pagos, setPagos] = useState<PagoRow[]>([nuevaFilaPago()]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => parseMonto(totalStr) ?? 0, [totalStr]);
  const sumaPagosActual = sumaPagos(pagos);
  const pagosOk = pagosCompletos(pagos) && Math.abs(sumaPagosActual - total) < 0.01;
  const puedeConfirmar = descripcion.trim().length > 0 && total > 0 && pagosOk;

  async function confirmar() {
    if (!descripcion.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }
    if (total <= 0) {
      setError("Ingresá el monto total del movimiento.");
      return;
    }
    if (!pagosOk) {
      setError("La suma de los pagos tiene que coincidir exactamente con el total.");
      return;
    }
    setEnviando(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("registrar_caja_manual", {
      p_tipo: tipo,
      p_descripcion: descripcion.trim(),
      p_pagos: pagos.map((p) => ({
        forma_pago_id: p.formaPagoId,
        cuenta_id: p.cuentaId,
        monto: parseMonto(p.monto),
      })),
    });
    setEnviando(false);
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
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#2a2216] bg-[#111111] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="font-display text-lg uppercase text-[#efe9df]">
            Nuevo {tipo === "ingreso" ? "ingreso" : "egreso"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#2a2216] px-2 py-1 text-sm"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Descripción (obligatoria)
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={tipo === "ingreso" ? "Ej: Reintegro, aporte..." : "Ej: Pago de alquiler..."}
              className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Monto total del {tipo === "ingreso" ? "ingreso" : "egreso"}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={totalStr}
              onChange={(e) => setTotalStr(e.target.value)}
              placeholder="0"
              className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
            />
          </div>

          <PagosSelector filas={pagos} onChange={setPagos} total={total} />

          {error && <p className="text-xs font-semibold text-[#d62828]">{error}</p>}

          <button
            type="button"
            disabled={enviando || !puedeConfirmar}
            onClick={confirmar}
            className="self-start rounded-lg bg-[#f2891f] px-6 py-2.5 text-sm font-bold text-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
