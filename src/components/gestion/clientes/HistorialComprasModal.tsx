"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Venta {
  id: string;
  cantidad: number;
  precio_unitario: number | null;
  fecha: string;
  productos: { detalle: string; codigo: string } | null;
}

interface PagoDetalle {
  monto: number;
  formas_pago: { nombre: string } | null;
  cuentas: { nombre: string } | null;
}

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

export default function HistorialComprasModal({
  clienteId,
  clienteNombre,
  onClose,
}: {
  clienteId: string;
  clienteNombre: string;
  onClose: () => void;
}) {
  const [ventas, setVentas] = useState<Venta[] | null>(null);
  const [pagosPorVenta, setPagosPorVenta] = useState<Record<string, PagoDetalle[]>>({});

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("movimientos_stock")
        .select("id, cantidad, precio_unitario, fecha, productos(detalle, codigo)")
        .eq("cliente_id", clienteId)
        .eq("tipo", "venta")
        .order("fecha", { ascending: false });
      const lista = (data as unknown as Venta[]) ?? [];
      setVentas(lista);

      if (lista.length > 0) {
        const { data: pagos } = await supabase
          .from("caja_movimientos")
          .select("monto, movimiento_stock_id, formas_pago(nombre), cuentas(nombre)")
          .in(
            "movimiento_stock_id",
            lista.map((v) => v.id)
          );
        const agrupado: Record<string, PagoDetalle[]> = {};
        for (const p of (pagos as unknown as (PagoDetalle & { movimiento_stock_id: string })[]) ?? []) {
          const key = p.movimiento_stock_id;
          if (!agrupado[key]) agrupado[key] = [];
          agrupado[key].push({ monto: p.monto, formas_pago: p.formas_pago, cuentas: p.cuentas });
        }
        setPagosPorVenta(agrupado);
      }
    })();
  }, [clienteId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#2a2216] bg-[#111111] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg uppercase text-[#efe9df]">Historial de compras</h3>
            <p className="text-sm text-[#a89a89]">{clienteNombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#2a2216] px-2 py-1 text-sm"
          >
            ✕
          </button>
        </div>

        {ventas === null && <p className="text-sm text-[#a89a89]">Cargando...</p>}
        {ventas !== null && ventas.length === 0 && (
          <p className="text-sm text-[#a89a89]">Todavía no tiene compras registradas.</p>
        )}
        {ventas !== null && ventas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[#a89a89]">
                <tr>
                  <th className="px-2 py-2">Fecha</th>
                  <th className="px-2 py-2">Producto</th>
                  <th className="px-2 py-2">Cantidad</th>
                  <th className="px-2 py-2">Precio total</th>
                  <th className="px-2 py-2">Pago</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  <tr key={v.id} className="border-t border-[#2a2216]">
                    <td className="px-2 py-2 whitespace-nowrap">{formatFecha(v.fecha)}</td>
                    <td className="px-2 py-2">{v.productos?.detalle ?? "—"}</td>
                    <td className="px-2 py-2">{v.cantidad}</td>
                    <td className="px-2 py-2">
                      {v.precio_unitario
                        ? `$${(v.precio_unitario * v.cantidad).toLocaleString("es-AR")}`
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-xs">{pagosATexto(pagosPorVenta[v.id])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
