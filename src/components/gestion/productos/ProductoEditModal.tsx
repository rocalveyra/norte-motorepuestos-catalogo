"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ProductoProveedoresManager from "@/components/gestion/productos/ProductoProveedoresManager";

export interface ProductoFila {
  id: string;
  codigo: string;
  detalle: string;
  descripcion: string | null;
  foto_url: string | null;
  unidad_medida: string;
  stock: number;
  precio_costo: number | null;
  precio_venta: number | null;
  lista2: number | null;
  lista3: number | null;
  en_promocion: boolean;
  precio_promocion: number | null;
  activo: boolean;
  categoria_id: string | null;
  categorias: { nombre: string } | null;
}

interface Opcion {
  id: string;
  nombre: string;
}

function numOrEmpty(n: number | null) {
  return n === null ? "" : String(n);
}

function parseNumOrNull(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export default function ProductoEditModal({
  producto,
  rol,
  onClose,
  onGuardado,
}: {
  producto: ProductoFila;
  rol: string;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const esAdmin = rol === "admin";

  const [detalle, setDetalle] = useState(producto.detalle);
  const [descripcion, setDescripcion] = useState(producto.descripcion ?? "");
  const [fotoUrl, setFotoUrl] = useState(producto.foto_url ?? "");
  const [enPromocion, setEnPromocion] = useState(producto.en_promocion);
  const [precioPromocion, setPrecioPromocion] = useState(numOrEmpty(producto.precio_promocion));

  const [categoriaId, setCategoriaId] = useState(producto.categoria_id ?? "");
  const [activo, setActivo] = useState(producto.activo);
  const [precioCosto, setPrecioCosto] = useState(numOrEmpty(producto.precio_costo));
  const [precioVenta, setPrecioVenta] = useState(numOrEmpty(producto.precio_venta));
  const [lista2, setLista2] = useState(numOrEmpty(producto.lista2));
  const [lista3, setLista3] = useState(numOrEmpty(producto.lista3));

  const [categorias, setCategorias] = useState<Opcion[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("categorias")
      .select("id, nombre")
      .order("orden")
      .then(({ data }) => setCategorias((data as Opcion[]) ?? []));
  }, []);

  async function guardar() {
    setGuardando(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("productos")
      .update({
        detalle: detalle.trim(),
        descripcion: descripcion.trim() || null,
        foto_url: fotoUrl.trim() || null,
        en_promocion: enPromocion,
        precio_promocion: parseNumOrNull(precioPromocion),
        categoria_id: categoriaId || null,
        activo,
        precio_costo: parseNumOrNull(precioCosto),
        precio_venta: parseNumOrNull(precioVenta),
        lista2: parseNumOrNull(lista2),
        lista3: parseNumOrNull(lista3),
      })
      .eq("id", producto.id);
    setGuardando(false);
    if (err) {
      setError(err.message);
      return;
    }
    onGuardado();
  }

  const inputAdmin =
    "rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f] disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#2a2216] bg-[#111111] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg uppercase text-[#efe9df]">Editar producto</h3>
            <p className="text-sm text-[#a89a89]">
              Código {producto.codigo} · {producto.unidad_medida}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#2a2216] px-2 py-1 text-sm"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Detalle
            </label>
            <input
              type="text"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              className={inputAdmin}
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className={inputAdmin}
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Foto (URL)
            </label>
            <input
              type="text"
              value={fotoUrl}
              onChange={(e) => setFotoUrl(e.target.value)}
              className={inputAdmin}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="en_promocion"
              checked={enPromocion}
              onChange={(e) => setEnPromocion(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="en_promocion" className="text-sm text-[#efe9df]">
              En promoción
            </label>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Precio de promoción
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={precioPromocion}
              onChange={(e) => setPrecioPromocion(e.target.value)}
              className={inputAdmin}
            />
          </div>

          <div className="sm:col-span-2">
            <ProductoProveedoresManager productoId={producto.id} />
          </div>

          <div className="sm:col-span-2 border-t border-[#2a2216] pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#f7c948]">
              {esAdmin ? "Editable solo por admin" : "Solo lectura (reservado a admin)"}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Categoría
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              disabled={!esAdmin}
              className={inputAdmin}
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Estado
            </label>
            <select
              value={activo ? "activo" : "inactivo"}
              onChange={(e) => setActivo(e.target.value === "activo")}
              disabled={!esAdmin}
              className={inputAdmin}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Costo
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={precioCosto}
              onChange={(e) => setPrecioCosto(e.target.value)}
              disabled={!esAdmin}
              className={inputAdmin}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Venta
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
              disabled={!esAdmin}
              className={inputAdmin}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Lista 2
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={lista2}
              onChange={(e) => setLista2(e.target.value)}
              disabled={!esAdmin}
              className={inputAdmin}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Lista 3
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={lista3}
              onChange={(e) => setLista3(e.target.value)}
              disabled={!esAdmin}
              className={inputAdmin}
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2 border-t border-[#2a2216] pt-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
              Stock ({producto.unidad_medida})
            </label>
            <input type="text" value={producto.stock} disabled className={inputAdmin} />
            <p className="text-xs text-[#a89a89]">
              El stock se ajusta únicamente desde Movimientos, no se edita acá.
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-[#d62828] bg-[#d62828]/10 px-4 py-2 text-sm font-semibold text-[#d62828]">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            disabled={guardando}
            onClick={guardar}
            className="rounded-lg bg-[#f2891f] px-6 py-2 text-sm font-bold text-[#0a0a0a] disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#2a2216] px-6 py-2 text-sm font-semibold text-[#efe9df]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
