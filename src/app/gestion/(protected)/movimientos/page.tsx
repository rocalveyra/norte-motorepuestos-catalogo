"use client";

import { useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import ProductoBuscador, {
  type ProductoResultado,
} from "@/components/gestion/movimientos/ProductoBuscador";
import ClienteBuscador, {
  type ClienteResultado,
} from "@/components/gestion/movimientos/ClienteBuscador";

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

export default function MovimientosPage() {
  const [producto, setProducto] = useState<ProductoResultado | null>(null);
  const [tipo, setTipo] = useState<Tipo>("compra");
  const [cantidad, setCantidad] = useState("");
  const [ajusteSigno, setAjusteSigno] = useState<"+" | "-">("+");
  const [motivo, setMotivo] = useState("");
  const [precioTipo, setPrecioTipo] = useState<PrecioTipo>("");
  const [precioOtro, setPrecioOtro] = useState("");
  const [cliente, setCliente] = useState<ClienteResultado | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(
    null
  );

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

  const stockInsuficiente =
    tipo === "venta" && producto !== null && cantidadNum > 0 && cantidadNum > producto.stock;

  const precioListo =
    precioTipo === ""
      ? true
      : precioTipo === "otro"
        ? precioUnitario !== null && precioUnitario > 0
        : precioUnitario !== null && precioUnitario > 0;

  const puedeConfirmar =
    producto !== null &&
    cantidadNum > 0 &&
    (tipo !== "ajuste" || motivo.trim().length > 0) &&
    (tipo !== "venta" || (precioTipo !== "" && precioListo)) &&
    precioListo;

  function resetParcial() {
    setProducto(null);
    setCantidad("");
    setMotivo("");
    setPrecioTipo("");
    setPrecioOtro("");
    setCliente(null);
    setAjusteSigno("+");
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

    if (precioTipo) {
      if (precioTipo === "otro") {
        if (!precioOtro.trim() || !precioUnitario || precioUnitario <= 0) {
          setMensaje({ tipo: "error", texto: 'Ingresá un monto válido para "Otro".' });
          return;
        }
      } else if (precioUnitario === null || precioUnitario <= 0) {
        setMensaje({
          tipo: "error",
          texto: `El producto no tiene cargado el precio "${PRECIO_LABELS[precioTipo]}".`,
        });
        return;
      }
    }

    if (tipo === "venta" && !precioTipo) {
      setMensaje({ tipo: "error", texto: "Elegí un precio para la venta." });
      return;
    }

    const cantidadFinal =
      tipo === "ajuste" ? (ajusteSigno === "-" ? -cantidadNum : cantidadNum) : cantidadNum;

    setEnviando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEnviando(false);
      setMensaje({ tipo: "error", texto: "Se perdió la sesión, volvé a loguearte." });
      return;
    }

    const { error } = await supabase.from("movimientos_stock").insert({
      producto_id: producto.id,
      tipo,
      cantidad: cantidadFinal,
      unidad_medida: producto.unidad_medida,
      precio_tipo: precioTipo || null,
      precio_unitario: precioTipo ? precioUnitario : null,
      cliente_id: tipo === "venta" ? (cliente?.id ?? null) : null,
      motivo: tipo === "ajuste" ? motivo.trim() : null,
      usuario_id: user.id,
    });

    setEnviando(false);

    if (error) {
      setMensaje({ tipo: "error", texto: error.message });
      return;
    }

    setMensaje({ tipo: "success", texto: "Movimiento cargado correctamente." });
    resetParcial();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl uppercase text-[#efe9df]">Movimientos</h1>
        <p className="text-sm text-[#a89a89]">Cargá compras, ventas y ajustes de stock.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
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
            Precio {tipo === "venta" ? "(obligatorio)" : "(opcional)"}
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
                  disabled={!producto}
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
              Cliente (opcional)
            </label>
            <ClienteBuscador cliente={cliente} onSelect={setCliente} />
          </div>
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
            {tipo === "venta" && precioUnitario !== null && cantidadNum > 0 && (
              <p className="mt-1 text-base font-bold text-[#efe9df]">
                Total: ${(precioUnitario * cantidadNum).toLocaleString("es-AR")}
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
          <button
            type="submit"
            disabled={enviando || !puedeConfirmar}
            className="self-start rounded-lg bg-[#f2891f] px-6 py-2.5 text-sm font-bold text-[#0a0a0a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando ? "Guardando..." : "Confirmar movimiento"}
          </button>
          {!puedeConfirmar && !enviando && (
            <p className="text-xs text-[#a89a89]">
              {!producto
                ? "Elegí un producto para continuar."
                : !cantidadNum || cantidadNum <= 0
                  ? "Ingresá una cantidad mayor a 0."
                  : tipo === "ajuste" && !motivo.trim()
                    ? "Escribí el motivo del ajuste."
                    : tipo === "venta" && !precioTipo
                      ? "Elegí un precio para la venta."
                      : "Completá los campos obligatorios para confirmar."}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
