"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface MovimientoHistorial {
  id: string;
  producto_id: string;
  tipo: "compra" | "venta" | "ajuste";
  cantidad: number;
  unidad_medida: string;
  precio_tipo: string | null;
  precio_unitario: number | null;
  cliente_id: string | null;
  motivo: string | null;
  fecha: string;
  productos: { codigo: string; detalle: string } | null;
  clientes: { nombre: string } | null;
  perfiles: { nombre: string } | null;
}

interface PagoDetalle {
  monto: number;
  formas_pago: { nombre: string } | null;
  cuentas: { nombre: string } | null;
}

const TIPO_LABEL: Record<string, string> = { compra: "Compra", venta: "Venta", ajuste: "Ajuste" };

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pagosATexto(pagos: PagoDetalle[] | undefined) {
  if (!pagos || pagos.length === 0) return "—";
  return pagos
    .map((p) => `${p.formas_pago?.nombre ?? "?"} / ${p.cuentas?.nombre ?? "?"} ($${p.monto.toLocaleString("es-AR")})`)
    .join(" + ");
}

export default function HistorialMovimientos({
  rol,
  recargarToken,
  onEditar,
}: {
  rol: string;
  recargarToken: number;
  onEditar: (row: MovimientoHistorial) => void;
}) {
  const [rows, setRows] = useState<MovimientoHistorial[]>([]);
  const [pagosPorMovimiento, setPagosPorMovimiento] = useState<Record<string, PagoDetalle[]>>({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productoTerm, setProductoTerm] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "compra" | "venta" | "ajuste">("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [detalle, setDetalle] = useState<MovimientoHistorial | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setCargando(true);
      setError(null);
      const supabase = createClient();

      let productoIds: string[] | null = null;
      if (productoTerm.trim().length >= 2) {
        const { data } = await supabase
          .from("productos")
          .select("id")
          .or(`codigo.ilike.%${productoTerm}%,detalle.ilike.%${productoTerm}%`)
          .limit(50);
        productoIds = (data ?? []).map((p) => p.id as string);
        if (productoIds.length === 0) {
          setRows([]);
          setCargando(false);
          return;
        }
      }

      let query = supabase
        .from("movimientos_stock")
        .select(
          "id, producto_id, tipo, cantidad, unidad_medida, precio_tipo, precio_unitario, cliente_id, motivo, fecha, productos(codigo, detalle), clientes(nombre), perfiles(nombre)"
        )
        .order("fecha", { ascending: false })
        .limit(200);

      if (tipoFiltro !== "todos") query = query.eq("tipo", tipoFiltro);
      if (productoIds) query = query.in("producto_id", productoIds);
      if (desde) query = query.gte("fecha", `${desde}T00:00:00`);
      if (hasta) query = query.lte("fecha", `${hasta}T23:59:59`);

      const { data, error: err } = await query;
      if (err) {
        setError(err.message);
        setCargando(false);
        return;
      }
      const movimientos = (data as unknown as MovimientoHistorial[]) ?? [];
      setRows(movimientos);

      const idsConMovimientoDinero = movimientos
        .filter((m) => m.tipo === "compra" || m.tipo === "venta")
        .map((m) => m.id);

      if (idsConMovimientoDinero.length > 0) {
        const { data: pagos } = await supabase
          .from("caja_movimientos")
          .select("monto, movimiento_stock_id, formas_pago(nombre), cuentas(nombre)")
          .in("movimiento_stock_id", idsConMovimientoDinero);
        const agrupado: Record<string, PagoDetalle[]> = {};
        for (const p of (pagos as unknown as (PagoDetalle & { movimiento_stock_id: string })[]) ?? []) {
          const key = p.movimiento_stock_id;
          if (!agrupado[key]) agrupado[key] = [];
          agrupado[key].push({ monto: p.monto, formas_pago: p.formas_pago, cuentas: p.cuentas });
        }
        setPagosPorMovimiento(agrupado);
      } else {
        setPagosPorMovimiento({});
      }

      setCargando(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [productoTerm, tipoFiltro, desde, hasta, recargarToken]);

  async function borrar(id: string) {
    if (
      !window.confirm(
        "Esta acción no se puede deshacer. ¿Confirmás que querés borrar este movimiento?"
      )
    ) {
      return;
    }
    setBorrando(id);
    setErrorBorrado(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("movimientos_stock").delete().eq("id", id);
    setBorrando(null);
    if (err) {
      setErrorBorrado(
        err.message.includes("foreign key")
          ? "No se puede borrar: hay pagos de caja asociados a este movimiento. Corregilos o eliminalos primero en Cuentas."
          : err.message
      );
      return;
    }
    setDetalle(null);
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function exportarCSV() {
    const encabezado = [
      "Fecha",
      "Producto",
      "Tipo",
      "Cantidad",
      "Unidad",
      "Precio",
      "Cliente",
      "Forma(s) de pago / cuenta",
      "Usuario",
    ];
    const filas = rows.map((r) => [
      formatFecha(r.fecha),
      `${r.productos?.codigo ?? ""} - ${r.productos?.detalle ?? ""}`,
      TIPO_LABEL[r.tipo],
      String(r.cantidad),
      r.unidad_medida,
      r.precio_unitario ? `$${r.precio_unitario.toLocaleString("es-AR")}` : "",
      r.clientes?.nombre ?? "",
      pagosATexto(pagosPorMovimiento[r.id]),
      r.perfiles?.nombre ?? "",
    ]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movimientos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl uppercase text-[#efe9df]">Historial</h2>
        <p className="text-sm text-[#a89a89]">Movimientos ya cargados, con filtros y exportación.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
            Producto
          </label>
          <input
            type="text"
            value={productoTerm}
            onChange={(e) => setProductoTerm(e.target.value)}
            placeholder="Código o detalle..."
            className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">Tipo</label>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as typeof tipoFiltro)}
            className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          >
            <option value="todos">Todos</option>
            <option value="compra">Compra</option>
            <option value="venta">Venta</option>
            <option value="ajuste">Ajuste</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          />
        </div>
        <button
          type="button"
          onClick={exportarCSV}
          disabled={rows.length === 0}
          className="rounded-lg border border-[#f7c948] px-4 py-2 text-xs font-bold text-[#f7c948] transition hover:bg-[#f7c948]/10 disabled:opacity-40"
        >
          Exportar CSV
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-[#d62828] bg-[#d62828]/10 px-4 py-2 text-sm text-[#d62828]">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-[#2a2216]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[#151109] text-xs uppercase tracking-wide text-[#a89a89]">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Cantidad</th>
              <th className="px-3 py-2">Precio</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Pago</th>
              <th className="px-3 py-2">Usuario</th>
              {rol === "admin" && <th className="px-3 py-2">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => setDetalle(r)}
                className="cursor-pointer border-t border-[#2a2216] hover:bg-[#151109]"
              >
                <td className="px-3 py-2 whitespace-nowrap">{formatFecha(r.fecha)}</td>
                <td className="px-3 py-2">{r.productos?.detalle ?? "—"}</td>
                <td className="px-3 py-2 capitalize">{TIPO_LABEL[r.tipo]}</td>
                <td className="px-3 py-2">
                  {r.cantidad} {r.unidad_medida}
                </td>
                <td className="px-3 py-2">
                  {r.precio_unitario ? `$${r.precio_unitario.toLocaleString("es-AR")}` : "—"}
                </td>
                <td className="px-3 py-2">{r.clientes?.nombre ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{pagosATexto(pagosPorMovimiento[r.id])}</td>
                <td className="px-3 py-2">{r.perfiles?.nombre ?? "—"}</td>
                {rol === "admin" && (
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditar(r);
                        }}
                        className="text-xs font-semibold text-[#f7c948] hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={borrando === r.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          borrar(r.id);
                        }}
                        className="text-xs font-semibold text-[#d62828] hover:underline disabled:opacity-40"
                      >
                        {borrando === r.id ? "Borrando..." : "Borrar"}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!cargando && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-sm text-[#a89a89]">
                  No hay movimientos con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {errorBorrado && (
        <p className="rounded-lg border border-[#d62828] bg-[#d62828]/10 px-4 py-2 text-sm text-[#d62828]">
          {errorBorrado}
        </p>
      )}

      {detalle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setDetalle(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-[#2a2216] bg-[#111111] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <h3 className="font-display text-lg uppercase text-[#efe9df]">Detalle del movimiento</h3>
              <button
                type="button"
                onClick={() => setDetalle(null)}
                className="rounded-md border border-[#2a2216] px-2 py-1 text-sm"
              >
                ✕
              </button>
            </div>
            <dl className="flex flex-col gap-2 text-sm">
              <div>
                <dt className="text-xs text-[#a89a89]">Fecha</dt>
                <dd>{formatFecha(detalle.fecha)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#a89a89]">Producto</dt>
                <dd>
                  {detalle.productos?.codigo} — {detalle.productos?.detalle}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#a89a89]">Tipo / Cantidad</dt>
                <dd>
                  {TIPO_LABEL[detalle.tipo]} · {detalle.cantidad} {detalle.unidad_medida}
                </dd>
              </div>
              {detalle.precio_unitario && (
                <div>
                  <dt className="text-xs text-[#a89a89]">Precio</dt>
                  <dd>
                    ${detalle.precio_unitario.toLocaleString("es-AR")} ({detalle.precio_tipo})
                  </dd>
                </div>
              )}
              {detalle.clientes && (
                <div>
                  <dt className="text-xs text-[#a89a89]">Cliente</dt>
                  <dd>{detalle.clientes.nombre}</dd>
                </div>
              )}
              {detalle.motivo && (
                <div>
                  <dt className="text-xs text-[#a89a89]">Motivo</dt>
                  <dd>{detalle.motivo}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-[#a89a89]">Pagos</dt>
                <dd className="flex flex-col gap-1">
                  {(pagosPorMovimiento[detalle.id] ?? []).length === 0 && "—"}
                  {(pagosPorMovimiento[detalle.id] ?? []).map((p, i) => (
                    <span key={i}>
                      {p.formas_pago?.nombre} / {p.cuentas?.nombre}: ${p.monto.toLocaleString("es-AR")}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#a89a89]">Cargado por</dt>
                <dd>{detalle.perfiles?.nombre ?? "—"}</dd>
              </div>
            </dl>
            {rol === "admin" && (
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onEditar(detalle);
                    setDetalle(null);
                  }}
                  className="rounded-lg border border-[#f7c948] px-3 py-1.5 text-xs font-bold text-[#f7c948]"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => borrar(detalle.id)}
                  className="rounded-lg border border-[#d62828] px-3 py-1.5 text-xs font-bold text-[#d62828]"
                >
                  Borrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
