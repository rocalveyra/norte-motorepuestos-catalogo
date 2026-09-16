"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { descargarCSV } from "@/lib/csv";
import CajaManualModal from "@/components/gestion/caja/CajaManualModal";
import CajaDetalleModal from "@/components/gestion/caja/CajaDetalleModal";

export interface CajaFila {
  id: string;
  tipo: "ingreso" | "egreso";
  origen: "venta_stock" | "compra_stock" | "manual";
  monto: number;
  descripcion: string | null;
  movimiento_stock_id: string | null;
  forma_pago_id: string;
  cuenta_id: string;
  usuario_id: string;
  fecha: string;
  formas_pago: { nombre: string } | null;
  cuentas: { nombre: string } | null;
  perfiles: { nombre: string } | null;
  movimientos_stock: {
    tipo: string;
    productos: { detalle: string; codigo: string } | null;
    clientes: { nombre: string } | null;
  } | null;
}

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

export default function CajaClient({ rol }: { rol: string }) {
  const [cuentas, setCuentas] = useState<Opcion[]>([]);
  const [formasPago, setFormasPago] = useState<Opcion[]>([]);
  const [saldos, setSaldos] = useState<Record<string, number>>({});
  const [movimientos, setMovimientos] = useState<CajaFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cuentaFiltro, setCuentaFiltro] = useState("");
  const [formaPagoFiltro, setFormaPagoFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "ingreso" | "egreso">("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [modalNuevo, setModalNuevo] = useState<"ingreso" | "egreso" | null>(null);
  const [detalle, setDetalle] = useState<CajaFila | null>(null);
  const [recargarToken, setRecargarToken] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [{ data: c }, { data: fp }] = await Promise.all([
        supabase.from("cuentas").select("id, nombre").eq("activa", true).order("orden"),
        supabase.from("formas_pago").select("id, nombre").eq("activa", true).order("orden"),
      ]);
      setCuentas((c as Opcion[]) ?? []);
      setFormasPago((fp as Opcion[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("caja_movimientos")
      .select("tipo, monto, cuenta_id")
      .then(({ data }) => {
        const acc: Record<string, number> = {};
        for (const row of (data as { tipo: string; monto: number; cuenta_id: string }[]) ?? []) {
          const signo = row.tipo === "ingreso" ? 1 : -1;
          acc[row.cuenta_id] = (acc[row.cuenta_id] ?? 0) + signo * row.monto;
        }
        setSaldos(acc);
      });
  }, [recargarToken]);

  async function cargarMovimientos() {
    setCargando(true);
    setError(null);
    const supabase = createClient();
    let query = supabase
      .from("caja_movimientos")
      .select(
        "id, tipo, origen, monto, descripcion, movimiento_stock_id, forma_pago_id, cuenta_id, usuario_id, fecha, formas_pago(nombre), cuentas(nombre), perfiles(nombre), movimientos_stock(tipo, productos(detalle, codigo), clientes(nombre))"
      )
      .order("fecha", { ascending: false })
      .limit(200);

    if (cuentaFiltro) query = query.eq("cuenta_id", cuentaFiltro);
    if (formaPagoFiltro) query = query.eq("forma_pago_id", formaPagoFiltro);
    if (tipoFiltro !== "todos") query = query.eq("tipo", tipoFiltro);
    if (desde) query = query.gte("fecha", `${desde}T00:00:00`);
    if (hasta) query = query.lte("fecha", `${hasta}T23:59:59`);

    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
      setCargando(false);
      return;
    }
    setMovimientos((data as unknown as CajaFila[]) ?? []);
    setCargando(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      cargarMovimientos();
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentaFiltro, formaPagoFiltro, tipoFiltro, desde, hasta, recargarToken]);

  function exportarCSV() {
    const encabezado = [
      "Fecha",
      "Tipo",
      "Origen",
      "Monto",
      "Forma de pago",
      "Cuenta",
      "Detalle",
      "Usuario",
    ];
    const filas = movimientos.map((m) => [
      formatFecha(m.fecha),
      m.tipo,
      ORIGEN_LABEL[m.origen] ?? m.origen,
      String(m.monto),
      m.formas_pago?.nombre ?? "",
      m.cuentas?.nombre ?? "",
      m.origen === "manual"
        ? (m.descripcion ?? "")
        : [m.movimientos_stock?.productos?.detalle, m.movimientos_stock?.clientes?.nombre]
            .filter(Boolean)
            .join(" · "),
      m.perfiles?.nombre ?? "",
    ]);
    descargarCSV(`caja_${new Date().toISOString().slice(0, 10)}.csv`, encabezado, filas);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl uppercase text-[#efe9df]">Caja</h1>
          <p className="text-sm text-[#a89a89]">Saldo por cuenta e historial de movimientos.</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setModalNuevo("ingreso")}
            className="rounded-lg border border-[#7cb464] px-4 py-2 text-sm font-bold text-[#7cb464] transition hover:bg-[#7cb464]/10"
          >
            + Nuevo ingreso
          </button>
          <button
            type="button"
            onClick={() => setModalNuevo("egreso")}
            className="rounded-lg border border-[#d62828] px-4 py-2 text-sm font-bold text-[#d62828] transition hover:bg-[#d62828]/10"
          >
            + Nuevo egreso
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {cuentas.map((c) => {
          const saldo = saldos[c.id] ?? 0;
          return (
            <div key={c.id} className="rounded-lg border border-[#2a2216] bg-[#151109] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
                {c.nombre}
              </p>
              <p
                className={`mt-1 text-lg font-bold ${saldo < 0 ? "text-[#d62828]" : "text-[#efe9df]"}`}
              >
                ${saldo.toLocaleString("es-AR")}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
            Cuenta
          </label>
          <select
            value={cuentaFiltro}
            onChange={(e) => setCuentaFiltro(e.target.value)}
            className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          >
            <option value="">Todas</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
            Forma de pago
          </label>
          <select
            value={formaPagoFiltro}
            onChange={(e) => setFormaPagoFiltro(e.target.value)}
            className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          >
            <option value="">Todas</option>
            {formasPago.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
            Tipo
          </label>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as typeof tipoFiltro)}
            className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          >
            <option value="todos">Todos</option>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
            Desde
          </label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
            Hasta
          </label>
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
          disabled={movimientos.length === 0}
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
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-[#151109] text-xs uppercase tracking-wide text-[#a89a89]">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Origen</th>
              <th className="px-3 py-2">Monto</th>
              <th className="px-3 py-2">Forma de pago</th>
              <th className="px-3 py-2">Cuenta</th>
              <th className="px-3 py-2">Detalle</th>
              <th className="px-3 py-2">Usuario</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => (
              <tr
                key={m.id}
                onClick={() => setDetalle(m)}
                className="cursor-pointer border-t border-[#2a2216] hover:bg-[#151109]"
              >
                <td className="px-3 py-2 whitespace-nowrap">{formatFecha(m.fecha)}</td>
                <td className={`px-3 py-2 capitalize ${m.tipo === "egreso" ? "text-[#d62828]" : "text-[#7cb464]"}`}>
                  {m.tipo}
                </td>
                <td className="px-3 py-2">{ORIGEN_LABEL[m.origen] ?? m.origen}</td>
                <td className="px-3 py-2 font-semibold">${m.monto.toLocaleString("es-AR")}</td>
                <td className="px-3 py-2">{m.formas_pago?.nombre ?? "—"}</td>
                <td className="px-3 py-2">{m.cuentas?.nombre ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {m.origen === "manual" ? (
                    m.descripcion
                  ) : m.movimiento_stock_id ? (
                    <span className="flex flex-col">
                      <span>
                        {m.movimientos_stock?.productos?.detalle ?? "—"}
                        {m.movimientos_stock?.clientes && ` · ${m.movimientos_stock.clientes.nombre}`}
                      </span>
                      <Link
                        href="/gestion/movimientos"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#f2891f] hover:underline"
                      >
                        Ver en Movimientos →
                      </Link>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">{m.perfiles?.nombre ?? "—"}</td>
              </tr>
            ))}
            {!cargando && movimientos.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-[#a89a89]">
                  No hay movimientos de caja con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalNuevo && (
        <CajaManualModal
          tipo={modalNuevo}
          onClose={() => setModalNuevo(null)}
          onGuardado={() => {
            setModalNuevo(null);
            setRecargarToken((t) => t + 1);
          }}
        />
      )}

      {detalle && (
        <CajaDetalleModal
          fila={detalle}
          rol={rol}
          onClose={() => setDetalle(null)}
          onCambio={() => {
            setDetalle(null);
            setRecargarToken((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}
