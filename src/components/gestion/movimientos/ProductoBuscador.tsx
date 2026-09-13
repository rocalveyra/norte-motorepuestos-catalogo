"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ProductoResultado {
  id: string;
  codigo: string;
  detalle: string;
  unidad_medida: string;
  stock: number;
  precio_costo: number | null;
  precio_venta: number | null;
  lista2: number | null;
  lista3: number | null;
  categorias: { nombre: string } | null;
}

const PRODUCTO_SELECT =
  "id, codigo, detalle, unidad_medida, stock, precio_costo, precio_venta, lista2, lista3, categorias(nombre)";

export default function ProductoBuscador({
  producto,
  onSelect,
}: {
  producto: ProductoResultado | null;
  onSelect: (p: ProductoResultado | null) => void;
}) {
  const [term, setTerm] = useState("");
  const [resultados, setResultados] = useState<ProductoResultado[]>([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (producto || term.trim().length < 2) {
      return;
    }
    const supabase = createClient();
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("productos")
        .select(PRODUCTO_SELECT)
        .eq("activo", true)
        .or(
          `codigo.ilike.%${term}%,detalle.ilike.%${term}%,familia.ilike.%${term}%,marca.ilike.%${term}%`
        )
        .limit(8);
      setResultados((data as unknown as ProductoResultado[]) ?? []);
      setAbierto(true);
    }, 250);
    return () => clearTimeout(timeout);
  }, [term, producto]);

  if (producto) {
    return (
      <div className="rounded-lg border border-[#2a2216] bg-[#151109] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-[#efe9df]">{producto.detalle}</p>
            <p className="text-xs text-[#a89a89]">
              {producto.categorias?.nombre ?? "Sin categoría"} · Código {producto.codigo} · Unidad:{" "}
              {producto.unidad_medida}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setTerm("");
              setResultados([]);
              setAbierto(false);
            }}
            className="shrink-0 text-xs font-semibold text-[#d62828] hover:underline"
          >
            Cambiar
          </button>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
          <div>
            <dt className="text-xs text-[#a89a89]">Stock</dt>
            <dd className="font-semibold">{producto.stock}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#a89a89]">Costo</dt>
            <dd>${producto.precio_costo?.toLocaleString("es-AR") ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#a89a89]">Venta</dt>
            <dd>${producto.precio_venta?.toLocaleString("es-AR") ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#a89a89]">Lista 2</dt>
            <dd>${producto.lista2?.toLocaleString("es-AR") ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#a89a89]">Lista 3</dt>
            <dd>${producto.lista3?.toLocaleString("es-AR") ?? "—"}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={term}
        onChange={(e) => {
          const v = e.target.value;
          setTerm(v);
          if (v.trim().length < 2) setResultados([]);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar por código, detalle, familia o marca..."
        className="w-full rounded-lg border border-[#2a2216] bg-[#151109] px-4 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
      />
      {abierto && resultados.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#2a2216] bg-[#151109] shadow-xl">
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(p);
                  setAbierto(false);
                }}
                className="flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left text-sm hover:bg-[#1c1712]"
              >
                <span className="font-medium text-[#efe9df]">{p.detalle}</span>
                <span className="text-xs text-[#a89a89]">
                  Código {p.codigo} · Stock {p.stock}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
