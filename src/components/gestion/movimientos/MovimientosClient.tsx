"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ProductoBuscador, {
  type ProductoResultado,
} from "@/components/gestion/movimientos/ProductoBuscador";
import ClienteBuscador, {
  type ClienteResultado,
} from "@/components/gestion/movimientos/ClienteBuscador";
import PagosSelector, {
  nuevaFilaPago,
  pagosCompletos,
  parseMonto,
  sumaPagos,
  type PagoRow,
} from "@/components/gestion/movimientos/PagosSelector";
import HistorialMovimientos, {
  type MovimientoHistorial,
} from "@/components/gestion/movimientos/HistorialMovimientos";

type Tipo = "compra" | "venta" | "ajuste";
type PrecioTipo = "costo" | "venta" | "lista2" | "lista3" | "otro" | "";

const PRECIO_LABELS: Record<Exclude<PrecioTipo, "">, string> = {
  costo: "Costo",
  venta: "Venta",
  lista2: "Lista 2",
  lista3: "Lista 3",
  otro: "Otro",
};

function parseNum(raw: string): number | null {
  const n = parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export default function MovimientosClient({ rol }: { rol: string }) {
  const [producto, setProducto] = useState<ProductoResultado | null>(null);
  const [tipo, setTipo] = useState<Tipo>("compra");
  const [cantidad, setCantidad] = useState("");
  const [ajusteSigno, setAjusteSigno] = useState<"+" | "-">("+");
  const [motivo, setMotivo] = useState("");
  const [precioTipo, setPrecioTipo] = useState<PrecioTipo>("");
  const [precioOtro, setPrecioOtro] = useState("");
  const [cliente, setCliente] = useState<ClienteResultado | null>(null);
  const [pagos, setPagos] = useState<PagoRow[]>([nuevaFilaPago()]);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(
    null
  );

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [recargarToken, setRecargarToken] = useState(0);

  const cantidadNum = useMemo(() => parseNum(cantidad) ?? 0, [cantidad]);

  const precioUnitario = useMemo(() => {
    if (!producto || !precioTipo) return null;
    if (precioTipo === "otro") return parseNum(precioOtro);
    const map: Record<string, number | null> = {
      costo: producto.precio_costo,
      venta: producto.precio_venta,
      lista2: producto.lista2,
      lista3: producto.lista3,
    };
    return map[precioTipo] ?? null;
  }, [producto, precioTipo, precioOtro]);

  const precioObligatorio = tipo === "compra" || tipo === "venta";
  const pagosObligatorios = editandoId === null && (tipo === "compra" || tipo === "venta");

  const stockInsuficiente =
    tipo === "venta" && producto !== null && cantidadNum > 0 && cantidadNum > producto.stock;

  const precioListo = precioUnitario !== null && precioUnitario > 0;

  const totalMovimiento =
    precioUnitario !== null && cantidadNum > 0
      ? Math.round(precioUnitario * cantidadNum * 100) / 100
      : 0;

  const sumaPagosActual = sumaPagos(pagos);
  const pagosOk = pagosCompletos(pagos) && Math.abs(sumaPagosActual - totalMovimiento) < 0.01;

  const puedeConfirmar =
    producto !== null &&
    cantidadNum > 0 &&
    (tipo !== "ajuste" || motivo.trim().length > 0) &&
    (!precioObligatorio || (precioTipo !== "" && precioListo)) &&
    (tipo !== "venta" || cliente !== null) &&
    (!pagosObligatorios || pagosOk);

  function resetFormulario() {
    setProducto(null);
    setCantidad("");
    setMotivo("");
    setPrecioTipo("");
    setPrecioOtro("");
    setCliente(null);
    setAjusteSigno("+");
    setPagos([nuevaFilaPago()]);
    setEditandoId(null);
  }

  function cancelarEdicion() {
    resetFormulario();
    setMensaje(null);
  }

  async function iniciarEdicion(row: MovimientoHistorial) {
    setMensaje(null);
    const supabase = createClient();
    const { data: prod } = await supabase
      .from("productos")
      .select(
        "id, codigo, detalle, unidad_medida, stock, precio_costo, precio_venta, lista2, lista3, categorias(nombre)"
      )
      .eq("id", row.producto_id)
      .single();

    if (!prod) {
      setMensaje({ tipo: "error", texto: "No se pudo cargar el producto de este movimiento." });
      return;
    }

    setProducto(prod as unknown as ProductoResultado);
    setTipo(row.tipo);
    setCantidad(String(Math.abs(row.cantidad)));
    setAjusteSigno(row.cantidad < 0 ? "-" : "+");
    setPrecioTipo((row.precio_tipo as PrecioTipo) ?? "");
    setPrecioOtro(row.precio_tipo === "otro" ? String(row.precio_unitario ?? "") : "");
    setMotivo(row.motivo ?? "");
    if (row.cliente_id && row.clientes) {
      setCliente({ id: row.cliente_id, nombre: row.clientes.nombre, telefono: null });
    } else {
      setCliente(null);
    }
    setEditandoId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMensaje(null);

    if (!producto) {
      setMensaje({ tipo: "error", texto: "Elegí un producto antes de confirmar." });
      return;
    }
    if (!cantidadNum || cantidadNum <= 0) {
      setMensaje({ tipo: "error", texto: "Ingresá una cantidad mayor a 0." });
      return;
    }
    if (tipo === "ajuste" && !motivo.trim()) {
      setMensaje({ tipo: "error", texto: "El motivo es obligatorio para cargar un ajuste." });
      return;
    }
    if (precioObligatorio && (!precioTipo || !precioListo)) {
      setMensaje({
        tipo: "error",
        texto: `El precio es obligatorio para ${tipo}.`,
      });
      return;
    }
    if (tipo === "venta" && !cliente) {
      setMensaje({ tipo: "error", texto: "El cliente es obligatorio para una venta." });
      return;
    }
    if (pagosObligatorios && !pagosOk) {
      setMensaje({
        tipo: "error",
        texto: "La suma de los pagos tiene que coincidir exactamente con el total del movimiento.",
      });
      return;
    }

    const cantidadFinal =
      tipo === "ajuste" ? (ajusteSigno === "-" ? -cantidadNum : cantidadNum) : cantidadNum;

    setEnviando(true);
    const supabase = createClient();

    if (editandoId) {
      const { error } = await supabase
        .from("movimientos_stock")
        .update({
          producto_id: producto.id,
          tipo,
          cantidad: cantidadFinal,
          unidad_medida: producto.unidad_medida,
          precio_tipo: precioTipo || null,
          precio_unitario: precioTipo ? precioUnitario : null,
          cliente_id: tipo === "venta" ? (cliente?.id ?? null) : null,
          motivo: tipo === "ajuste" ? motivo.trim() : null,
        })
        .eq("id", editandoId);

      setEnviando(false);
      if (error) {
        setMensaje({ tipo: "error", texto: error.message });
        return;
      }
      setMensaje({ tipo: "success", texto: "Movimiento actualizado correctamente." });
      resetFormulario();
      setRecargarToken((t) => t + 1);
      return;
    }

    const { error } = await supabase.rpc("registrar_movimiento_stock", {
      p_producto_id: producto.id,
      p_tipo: tipo,
      p_cantidad: cantidadFinal,
      p_unidad_medida: producto.unidad_medida,
      p_precio_tipo: precioTipo || null,
      p_precio_unitario: precioTipo ? precioUnitario : null,
      p_cliente_id: tipo === "venta" ? (cliente?.id ?? null) : null,
      p_motivo: tipo === "ajuste" ? motivo.trim() : null,
      p_pagos: pagosObligatorios
        ? pagos.map((p) => ({
            forma_pago_id: p.formaPagoId,
            cuenta_id: p.cuentaId,
            monto: parseMonto(p.monto),
          }))
        : null,
    });

    setEnviando(false);

    if (error) {
      setMensaje({ tipo: "error", texto: error.message });
      return;
    }

    setMensaje({ tipo: "success", texto: "Movimiento cargado correctamente." });
    resetFormulario();
    setRecargarToken((t) => t + 1);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/gestion"
          className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[#a89a89] hover:text-[#f2891f]"
        >
          ← Volver
        </Link>
        <h1 className="font-display text-2xl uppercase text-[#efe9df]">Movimientos</h1>
        <p className="text-sm text-[#a89a89]">Cargá compras, ventas y ajustes de stock.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
        {editandoId && (
          <p className="rounded-lg border border-[#f7c948] bg-[#f7c948]/10 px-4 py-2 text-sm font-semibold text-[#f7c948]">
            Estás editando un movimiento existente. Si cambiás la cantidad o el precio de una
            compra/venta, el stock se recalcula solo, pero los pagos de caja ya generados NO se
            ajustan automáticamente — revisá la pantalla de Cuentas si hace falta corregirlos a
            mano.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
            Producto
          </label>
          <ProductoBuscador producto={producto} onSelect={setProducto} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
            Tipo de movimiento
          </label>
          <div className="flex gap-2">
            {(["compra", "venta", "ajuste"] as Tipo[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTipo(t);
                  setMensaje(null);
                }}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold capitalize transition ${
                  tipo === t
                    ? "border-[#f2891f] bg-[#f2891f] text-[#0a0a0a]"
                    : "border-[#2a2216] text-[#efe9df] hover:border-[#f2891f]/60"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {tipo === "ajuste" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
                Ajuste
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAjusteSigno("+")}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold ${
                    ajusteSigno === "+"
                      ? "border-[#7cb464] bg-[#7cb464]/20 text-[#7cb464]"
                      : "border-[#2a2216] text-[#efe9df]"
                  }`}
                >
                  + Sumar
                </button>
                <button
                  type="button"
                  onClick={() => setAjusteSigno("-")}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold ${
                    ajusteSigno === "-"
                      ? "border-[#d62828] bg-[#d62828]/20 text-[#d62828]"
                      : "border-[#2a2216] text-[#efe9df]"
                  }`}
                >
                  − Restar
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Cantidad {producto ? `(${producto.unidad_medida})` : ""}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="0"
              className="rounded-lg border border-[#2a2216] bg-[#151109] px-4 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
            />
          </div>
        </div>

        {stockInsuficiente && (
          <p className="rounded-lg border border-[#d62828] bg-[#d62828]/10 px-4 py-2 text-sm font-semibold text-[#d62828]">
            ⚠ El stock quedaría en negativo (stock actual: {producto?.stock}).
          </p>
        )}

        {tipo === "ajuste" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Motivo (obligatorio)
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: inventario semanal, rotura, diferencia de conteo..."
              className="rounded-lg border border-[#2a2216] bg-[#151109] px-4 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
            Precio {precioObligatorio ? "(obligatorio)" : "(no aplica)"}
          </label>
          <div className="flex flex-wrap gap-2">
            {(["costo", "venta", "lista2", "lista3", "otro"] as const).map((opt) => {
              const valor = producto
                ? opt === "costo"
                  ? producto.precio_costo
                  : opt === "venta"
                    ? producto.precio_venta
                    : opt === "lista2"
                      ? producto.lista2
                      : opt === "lista3"
                        ? producto.lista3
                        : null
                : null;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={!producto || tipo === "ajuste"}
                  onClick={() => setPrecioTipo(precioTipo === opt ? "" : opt)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                    precioTipo === opt
                      ? "border-[#f7c948] bg-[#f7c948]/20 text-[#f7c948]"
                      : "border-[#2a2216] text-[#efe9df] hover:border-[#f7c948]/60"
                  }`}
                >
                  {PRECIO_LABELS[opt]}
                  {producto && opt !== "otro" && (
                    <span className="ml-1 text-[#a89a89]">
                      ${valor?.toLocaleString("es-AR") ?? "—"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {precioTipo === "otro" && (
            <input
              type="text"
              inputMode="decimal"
              value={precioOtro}
              onChange={(e) => setPrecioOtro(e.target.value)}
              placeholder="Monto"
              className="mt-1 rounded-lg border border-[#2a2216] bg-[#151109] px-4 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
            />
          )}
        </div>

        {tipo === "venta" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Cliente (obligatorio)
            </label>
            <ClienteBuscador cliente={cliente} onSelect={setCliente} />
          </div>
        )}

        {pagosObligatorios && (
          <PagosSelector filas={pagos} onChange={setPagos} total={totalMovimiento} />
        )}

        {producto && (
          <div className="rounded-lg border border-[#2a2216] bg-[#151109] p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Vas a cargar
            </p>
            <p className="mt-1 text-[#efe9df]">
              <span className="font-bold capitalize text-[#f2891f]">{tipo}</span>
              {tipo === "ajuste" && (ajusteSigno === "-" ? " (restar)" : " (sumar)")} de{" "}
              <span className="font-semibold">
                {cantidadNum || "—"} {producto.unidad_medida}
              </span>{" "}
              de <span className="font-semibold">{producto.detalle}</span>
              {precioTipo && precioUnitario !== null && (
                <>
                  {" "}
                  a{" "}
                  <span className="font-semibold text-[#f7c948]">
                    ${precioUnitario.toLocaleString("es-AR")}
                  </span>{" "}
                  ({PRECIO_LABELS[precioTipo]})
                </>
              )}
              {tipo === "venta" && cliente && (
                <>
                  {" "}
                  · Cliente: <span className="font-semibold">{cliente.nombre}</span>
                </>
              )}
            </p>
            {precioObligatorio && precioUnitario !== null && cantidadNum > 0 && (
              <p className="mt-1 text-base font-bold text-[#efe9df]">
                Total: ${totalMovimiento.toLocaleString("es-AR")}
              </p>
            )}
          </div>
        )}

        {mensaje && (
          <p
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
              mensaje.tipo === "success"
                ? "border-[#7cb464] bg-[#7cb464]/10 text-[#7cb464]"
                : "border-[#d62828] bg-[#d62828]/10 text-[#d62828]"
            }`}
          >
            {mensaje.texto}
          </p>
        )}

        <div className="flex flex-col items-start gap-1.5">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={enviando || !puedeConfirmar}
              className="self-start rounded-lg bg-[#f2891f] px-6 py-2.5 text-sm font-bold text-[#0a0a0a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enviando ? "Guardando..." : editandoId ? "Guardar cambios" : "Confirmar movimiento"}
            </button>
            {editandoId && (
              <button
                type="button"
                onClick={cancelarEdicion}
                className="self-start rounded-lg border border-[#2a2216] px-6 py-2.5 text-sm font-semibold text-[#efe9df]"
              >
                Cancelar edición
              </button>
            )}
          </div>
          {!puedeConfirmar && !enviando && (
            <p className="text-xs text-[#a89a89]">
              {!producto
                ? "Elegí un producto para continuar."
                : !cantidadNum || cantidadNum <= 0
                  ? "Ingresá una cantidad mayor a 0."
                  : tipo === "ajuste" && !motivo.trim()
                    ? "Escribí el motivo del ajuste."
                    : precioObligatorio && (!precioTipo || !precioListo)
                      ? `Elegí un precio para la ${tipo}.`
                      : tipo === "venta" && !cliente
                        ? "Elegí un cliente para la venta."
                        : pagosObligatorios && !pagosOk
                          ? "Completá los pagos hasta que sumen el total del movimiento."
                          : "Completá los campos obligatorios para confirmar."}
            </p>
          )}
        </div>
      </form>

      <HistorialMovimientos rol={rol} recargarToken={recargarToken} onEditar={iniciarEdicion} />
    </div>
  );
}
