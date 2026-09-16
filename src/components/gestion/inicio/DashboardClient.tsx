"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { calcularRango, rangoAnterior, type PeriodoTipo } from "@/lib/periodos";
import ProductosSinMovimientoModal, {
  type ProductoSinMovimiento,
} from "@/components/gestion/inicio/ProductosSinMovimientoModal";

interface VentaRow {
  producto_id: string;
  cantidad: number;
  precio_unitario: number | null;
  productos: { detalle: string; precio_costo: number | null } | null;
}

interface CajaRow {
  tipo: "ingreso" | "egreso";
  origen: "venta_stock" | "compra_stock" | "manual";
  monto: number;
  descripcion: string | null;
}

interface ProductoActivo {
  id: string;
  codigo: string;
  detalle: string;
  stock: number;
  precio_costo: number | null;
}

interface Datos {
  ventasTotal: number;
  ventasCantidad: number;
  variacionPct: number | null;
  topProductos: { detalle: string; cantidad: number }[];
  margenTotal: number;
  margenPct: number;
  gastosFijosTotal: number;
  gastosFijosDesglose: { descripcion: string; monto: number }[];
  flujoNeto: number;
  saldoCajaTotal: number;
  valorStockTotal: number;
  productosSinMovimiento: ProductoSinMovimiento[];
  valorSinMovimientoPct: number;
}

function money(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

export default function DashboardClient({ nombre }: { nombre: string }) {
  const [periodo, setPeriodo] = useState<PeriodoTipo>("mes");
  const [desdeCustom, setDesdeCustom] = useState("");
  const [hastaCustom, setHastaCustom] = useState("");
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verSinMovimiento, setVerSinMovimiento] = useState(false);

  // useMemo evita recalcular "ahora" (y por lo tanto la fecha "hasta") en
  // cada render — si no, el efecto de abajo entraría en loop de refetch.
  const rango = useMemo(
    () => calcularRango(periodo, desdeCustom, hastaCustom),
    [periodo, desdeCustom, hastaCustom]
  );
  const desdeISO = rango.desde.toISOString();
  const hastaISO = rango.hasta.toISOString();

  useEffect(() => {
    if (periodo === "personalizado" && (!desdeCustom || !hastaCustom)) return;

    let cancelado = false;

    (async () => {
      const supabase = createClient();
      const rangoActual = { desde: new Date(desdeISO), hasta: new Date(hastaISO) };
      const anterior = rangoAnterior(rangoActual);
      const hace90dias = new Date();
      hace90dias.setDate(hace90dias.getDate() - 90);

      const [ventasRes, ventasAnteriorRes, cajaPeriodoRes, cajaTotalRes, productosRes, ventas90Res] =
        await Promise.all([
          supabase
            .from("movimientos_stock")
            .select("producto_id, cantidad, precio_unitario, productos(detalle, precio_costo)")
            .eq("tipo", "venta")
            .gte("fecha", desdeISO)
            .lte("fecha", hastaISO),
          supabase
            .from("movimientos_stock")
            .select("cantidad, precio_unitario")
            .eq("tipo", "venta")
            .gte("fecha", anterior.desde.toISOString())
            .lte("fecha", anterior.hasta.toISOString()),
          supabase
            .from("caja_movimientos")
            .select("tipo, origen, monto, descripcion")
            .gte("fecha", desdeISO)
            .lte("fecha", hastaISO),
          supabase.from("caja_movimientos").select("tipo, monto"),
          supabase.from("productos").select("id, codigo, detalle, stock, precio_costo").eq("activo", true),
          supabase
            .from("movimientos_stock")
            .select("producto_id")
            .eq("tipo", "venta")
            .gte("fecha", hace90dias.toISOString()),
        ]);

      if (cancelado) return;

      const primerError =
        ventasRes.error ||
        ventasAnteriorRes.error ||
        cajaPeriodoRes.error ||
        cajaTotalRes.error ||
        productosRes.error ||
        ventas90Res.error;
      if (primerError) {
        setError(primerError.message);
        setCargando(false);
        return;
      }
      setError(null);

      const ventas = (ventasRes.data as unknown as VentaRow[]) ?? [];
      const ventasAnterior = (ventasAnteriorRes.data as { cantidad: number; precio_unitario: number | null }[]) ?? [];
      const cajaPeriodo = (cajaPeriodoRes.data as CajaRow[]) ?? [];
      const cajaTotal = (cajaTotalRes.data as { tipo: string; monto: number }[]) ?? [];
      const productos = (productosRes.data as unknown as ProductoActivo[]) ?? [];
      const idsConVenta90 = new Set(
        ((ventas90Res.data as { producto_id: string }[]) ?? []).map((v) => v.producto_id)
      );

      // KPI 2: ventas del período
      const ventasTotal = ventas.reduce((acc, v) => acc + v.cantidad * (v.precio_unitario ?? 0), 0);
      const ventasCantidad = ventas.length;
      const ventasAnteriorTotal = ventasAnterior.reduce(
        (acc, v) => acc + v.cantidad * (v.precio_unitario ?? 0),
        0
      );
      const variacionPct = ventasAnteriorTotal > 0 ? ((ventasTotal - ventasAnteriorTotal) / ventasAnteriorTotal) * 100 : null;

      // KPI 3: top 10 productos por cantidad vendida
      const cantidadPorProducto = new Map<string, { detalle: string; cantidad: number }>();
      for (const v of ventas) {
        const actual = cantidadPorProducto.get(v.producto_id);
        const detalle = v.productos?.detalle ?? "—";
        if (actual) {
          actual.cantidad += v.cantidad;
        } else {
          cantidadPorProducto.set(v.producto_id, { detalle, cantidad: v.cantidad });
        }
      }
      const topProductos = [...cantidadPorProducto.values()]
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10);

      // KPI 4: márgenes (con el costo actual del producto)
      const margenTotal = ventas.reduce((acc, v) => {
        const costo = v.productos?.precio_costo ?? 0;
        return acc + ((v.precio_unitario ?? 0) - costo) * v.cantidad;
      }, 0);
      const margenPct = ventasTotal > 0 ? (margenTotal / ventasTotal) * 100 : 0;

      // KPI 5: saldo total de caja (a hoy, todas las cuentas)
      const saldoCajaTotal = cajaTotal.reduce(
        (acc, c) => acc + (c.tipo === "ingreso" ? c.monto : -c.monto),
        0
      );

      // KPI 6: gastos fijos del período (egresos manuales)
      const gastosFijos = cajaPeriodo.filter((c) => c.tipo === "egreso" && c.origen === "manual");
      const gastosFijosTotal = gastosFijos.reduce((acc, c) => acc + c.monto, 0);
      const porDescripcion = new Map<string, number>();
      for (const g of gastosFijos) {
        const clave = g.descripcion?.trim() || "Sin descripción";
        porDescripcion.set(clave, (porDescripcion.get(clave) ?? 0) + g.monto);
      }
      const gastosFijosDesglose = [...porDescripcion.entries()]
        .map(([descripcion, monto]) => ({ descripcion, monto }))
        .sort((a, b) => b.monto - a.monto);

      // KPI 7: flujo de caja neto del período (todo lo de caja, sin filtrar por origen)
      const flujoNeto = cajaPeriodo.reduce(
        (acc, c) => acc + (c.tipo === "ingreso" ? c.monto : -c.monto),
        0
      );

      // KPI 8: valor de stock a costo (hoy, productos activos)
      const valorStockTotal = productos.reduce((acc, p) => acc + p.stock * (p.precio_costo ?? 0), 0);

      // KPI 9: rotación — productos activos sin ventas en los últimos 90 días
      const sinMovimiento = productos.filter((p) => !idsConVenta90.has(p.id));
      const productosSinMovimiento: ProductoSinMovimiento[] = sinMovimiento
        .map((p) => ({
          codigo: p.codigo,
          detalle: p.detalle,
          stock: p.stock,
          valor: p.stock * (p.precio_costo ?? 0),
        }))
        .sort((a, b) => b.valor - a.valor);
      const valorSinMovimiento = productosSinMovimiento.reduce((acc, p) => acc + p.valor, 0);
      const valorSinMovimientoPct = valorStockTotal > 0 ? (valorSinMovimiento / valorStockTotal) * 100 : 0;

      setDatos({
        ventasTotal,
        ventasCantidad,
        variacionPct,
        topProductos,
        margenTotal,
        margenPct,
        gastosFijosTotal,
        gastosFijosDesglose,
        flujoNeto,
        saldoCajaTotal,
        valorStockTotal,
        productosSinMovimiento,
        valorSinMovimientoPct,
      });
      setCargando(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [periodo, desdeISO, hastaISO, desdeCustom, hastaCustom]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl uppercase text-[#efe9df]">Inicio</h1>
        <p className="text-sm text-[#a89a89]">Hola, {nombre} — rol: admin</p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {(["hoy", "semana", "mes", "personalizado"] as PeriodoTipo[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriodo(p)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold capitalize transition ${
              periodo === p
                ? "border-[#f2891f] bg-[#f2891f] text-[#0a0a0a]"
                : "border-[#2a2216] text-[#efe9df] hover:border-[#f2891f]/60"
            }`}
          >
            {p === "hoy" ? "Hoy" : p === "semana" ? "Semana" : p === "mes" ? "Mes en curso" : "Personalizado"}
          </button>
        ))}
        {periodo === "personalizado" && (
          <>
            <input
              type="date"
              value={desdeCustom}
              onChange={(e) => setDesdeCustom(e.target.value)}
              className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
            />
            <input
              type="date"
              value={hastaCustom}
              onChange={(e) => setHastaCustom(e.target.value)}
              className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
            />
          </>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-[#d62828] bg-[#d62828]/10 px-4 py-2 text-sm text-[#d62828]">
          {error}
        </p>
      )}

      {cargando && !datos && <p className="text-sm text-[#a89a89]">Cargando indicadores...</p>}

      {datos && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-[#2a2216] bg-[#151109] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Ventas del período
            </p>
            <p className="mt-1 text-2xl font-bold text-[#efe9df]">{money(datos.ventasTotal)}</p>
            <p className="text-sm text-[#a89a89]">
              {datos.ventasCantidad} venta{datos.ventasCantidad === 1 ? "" : "s"}
            </p>
            {datos.variacionPct !== null && (
              <p
                className={`mt-1 text-xs font-semibold ${
                  datos.variacionPct >= 0 ? "text-[#7cb464]" : "text-[#d62828]"
                }`}
              >
                {datos.variacionPct >= 0 ? "▲" : "▼"} {Math.abs(datos.variacionPct).toFixed(1)}% vs.
                período anterior
              </p>
            )}
          </div>

          <div className="rounded-lg border border-[#2a2216] bg-[#151109] p-4 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Productos más vendidos
            </p>
            {datos.topProductos.length === 0 ? (
              <p className="mt-2 text-sm text-[#a89a89]">Sin ventas en este período.</p>
            ) : (
              <ol className="mt-2 flex flex-col gap-1 text-sm">
                {datos.topProductos.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="truncate text-[#efe9df]">
                      {i + 1}. {p.detalle}
                    </span>
                    <span className="shrink-0 font-semibold text-[#f7c948]">{p.cantidad}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-lg border border-[#2a2216] bg-[#151109] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">Márgenes</p>
            <p className="mt-1 text-2xl font-bold text-[#efe9df]">{money(datos.margenTotal)}</p>
            <p className="text-sm text-[#a89a89]">{datos.margenPct.toFixed(1)}% sobre lo facturado</p>
            <p className="mt-1 text-xs text-[#a89a89]">Calculado con el costo actual de cada producto.</p>
          </div>

          <div className="rounded-lg border border-[#2a2216] bg-[#151109] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Saldo total de caja
            </p>
            <p className="mt-1 text-2xl font-bold text-[#efe9df]">{money(datos.saldoCajaTotal)}</p>
            <Link href="/gestion/caja" className="text-xs font-semibold text-[#f2891f] hover:underline">
              Ver Caja →
            </Link>
          </div>

          <div className="rounded-lg border border-[#2a2216] bg-[#151109] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Gastos fijos del período
            </p>
            <p className="mt-1 text-2xl font-bold text-[#d62828]">{money(datos.gastosFijosTotal)}</p>
            {datos.gastosFijosDesglose.length > 0 && (
              <ul className="mt-2 flex flex-col gap-0.5 text-xs text-[#a89a89]">
                {datos.gastosFijosDesglose.slice(0, 5).map((g, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{g.descripcion}</span>
                    <span className="shrink-0">{money(g.monto)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-[#2a2216] bg-[#151109] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Flujo de caja neto del período
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${
                datos.flujoNeto >= 0 ? "text-[#7cb464]" : "text-[#d62828]"
              }`}
            >
              {datos.flujoNeto >= 0 ? "+" : ""}
              {money(datos.flujoNeto)}
            </p>
          </div>

          <div className="rounded-lg border border-[#2a2216] bg-[#151109] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Valor de stock a costo
            </p>
            <p className="mt-1 text-2xl font-bold text-[#efe9df]">{money(datos.valorStockTotal)}</p>
            <p className="mt-1 text-xs text-[#a89a89]">A la fecha de hoy, productos activos.</p>
          </div>

          <div className="rounded-lg border border-[#2a2216] bg-[#151109] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Rotación — sin movimiento (90 días)
            </p>
            <p className="mt-1 text-2xl font-bold text-[#f7c948]">
              {datos.valorSinMovimientoPct.toFixed(1)}%
            </p>
            <p className="text-sm text-[#a89a89]">
              {datos.productosSinMovimiento.length} producto
              {datos.productosSinMovimiento.length === 1 ? "" : "s"} sin ventas
            </p>
            <button
              type="button"
              onClick={() => setVerSinMovimiento(true)}
              className="mt-1 text-xs font-semibold text-[#f2891f] hover:underline"
            >
              Ver listado →
            </button>
          </div>
        </div>
      )}

      {verSinMovimiento && datos && (
        <ProductosSinMovimientoModal
          productos={datos.productosSinMovimiento}
          onClose={() => setVerSinMovimiento(false)}
        />
      )}
    </div>
  );
}
