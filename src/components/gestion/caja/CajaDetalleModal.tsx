"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CajaFila } from "@/components/gestion/caja/CajaClient";

interface Opcion {
  id: string;
  nombre: string;
}

const ORIGEN_LABEL: Record<string, string> = {
  venta_stock: "Venta",
  compra_stock: "Compra",
  manual: "Manual",
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CajaDetalleModal({
  fila,
  rol,
  onClose,
  onCambio,
}: {
  fila: CajaFila;
  rol: string;
  onClose: () => void;
  onCambio: () => void;
}) {
  const esAdmin = rol === "admin";
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState(fila.tipo);
  const [monto, setMonto] = useState(String(fila.monto));
  const [formaPagoId, setFormaPagoId] = useState(fila.forma_pago_id);
  const [cuentaId, setCuentaId] = useState(fila.cuenta_id);
  const [descripcion, setDescripcion] = useState(fila.descripcion ?? "");
  const [formasPago, setFormasPago] = useState<Opcion[]>([]);
  const [cuentas, setCuentas] = useState<Opcion[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editando) return;
    const supabase = createClient();
    (async () => {
      const [{ data: fp }, { data: c }] = await Promise.all([
        supabase.from("formas_pago").select("id, nombre").order("orden"),
        supabase.from("cuentas").select("id, nombre").order("orden"),
      ]);
      setFormasPago((fp as Opcion[]) ?? []);
      setCuentas((c as Opcion[]) ?? []);
    })();
  }, [editando]);

  async function guardar() {
    const montoNum = parseFloat(monto.replace(",", "."));
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    if (fila.origen === "manual" && !descripcion.trim()) {
      setError("La descripción es obligatoria en un movimiento manual.");
      return;
    }
    setGuardando(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("caja_movimientos")
      .update({
        tipo,
        monto: montoNum,
        forma_pago_id: formaPagoId,
        cuenta_id: cuentaId,
        descripcion: fila.origen === "manual" ? descripcion.trim() : fila.descripcion,
      })
      .eq("id", fila.id);
    setGuardando(false);
    if (err) {
      setError(err.message);
      return;
    }
    onCambio();
  }

  async function borrar() {
    if (
      !window.confirm(
        "Esta acción no se puede deshacer. ¿Confirmás que querés borrar este movimiento de caja?"
      )
    ) {
      return;
    }
    setBorrando(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("caja_movimientos").delete().eq("id", fila.id);
    setBorrando(false);
    if (err) {
      setError(err.message);
      return;
    }
    onCambio();
  }

  const inputClass =
    "rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]";

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
            {editando ? "Editar movimiento de caja" : "Detalle del movimiento"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#2a2216] px-2 py-1 text-sm"
          >
            ✕
          </button>
        </div>

        {(fila.origen === "venta_stock" || fila.origen === "compra_stock") && (
          <p className="mb-4 rounded-lg border border-[#f7c948] bg-[#f7c948]/10 px-4 py-2 text-sm font-semibold text-[#f7c948]">
            Este movimiento se generó automáticamente por una {ORIGEN_LABEL[fila.origen]?.toLowerCase()}.
            Para una corrección más prolija, lo normal es editarlo desde Movimientos (ahí se ve el
            movimiento de stock completo asociado) — pero también podés ajustarlo acá si hace falta.
          </p>
        )}

        {!editando && (
          <dl className="flex flex-col gap-2 text-sm">
            <div>
              <dt className="text-xs text-[#a89a89]">Fecha</dt>
              <dd>{formatFecha(fila.fecha)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#a89a89]">Tipo / Origen</dt>
              <dd className="capitalize">
                {fila.tipo} · {ORIGEN_LABEL[fila.origen] ?? fila.origen}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#a89a89]">Monto</dt>
              <dd className="text-base font-bold">${fila.monto.toLocaleString("es-AR")}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#a89a89]">Forma de pago / Cuenta</dt>
              <dd>
                {fila.formas_pago?.nombre ?? "—"} / {fila.cuentas?.nombre ?? "—"}
              </dd>
            </div>
            {fila.origen === "manual" && (
              <div>
                <dt className="text-xs text-[#a89a89]">Descripción</dt>
                <dd>{fila.descripcion}</dd>
              </div>
            )}
            {fila.movimientos_stock && (
              <div>
                <dt className="text-xs text-[#a89a89]">Producto / Cliente</dt>
                <dd>
                  {fila.movimientos_stock.productos?.detalle ?? "—"}
                  {fila.movimientos_stock.clientes && ` · ${fila.movimientos_stock.clientes.nombre}`}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-[#a89a89]">Cargado por</dt>
              <dd>{fila.perfiles?.nombre ?? "—"}</dd>
            </div>
          </dl>
        )}

        {editando && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
                Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as "ingreso" | "egreso")}
                className={inputClass}
              >
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
                Monto
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
                Forma de pago
              </label>
              <select
                value={formaPagoId}
                onChange={(e) => setFormaPagoId(e.target.value)}
                className={inputClass}
              >
                {formasPago.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
                Cuenta
              </label>
              <select
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className={inputClass}
              >
                {cuentas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </div>
            {fila.origen === "manual" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
                  Descripción
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-[#d62828] bg-[#d62828]/10 px-4 py-2 text-sm font-semibold text-[#d62828]">
            {error}
          </p>
        )}

        {esAdmin && (
          <div className="mt-4 flex gap-3">
            {editando ? (
              <>
                <button
                  type="button"
                  disabled={guardando}
                  onClick={guardar}
                  className="rounded-lg bg-[#f2891f] px-5 py-2 text-sm font-bold text-[#0a0a0a] disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="rounded-lg border border-[#2a2216] px-5 py-2 text-sm font-semibold text-[#efe9df]"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  className="rounded-lg border border-[#f7c948] px-5 py-2 text-sm font-bold text-[#f7c948]"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={borrando}
                  onClick={borrar}
                  className="rounded-lg border border-[#d62828] px-5 py-2 text-sm font-bold text-[#d62828] disabled:opacity-50"
                >
                  {borrando ? "Borrando..." : "Borrar"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
