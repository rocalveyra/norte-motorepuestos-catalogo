"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ProductoEditModal, { type ProductoFila } from "@/components/gestion/productos/ProductoEditModal";

const POR_PAGINA = 50;

const SELECT =
  "id, codigo, detalle, descripcion, foto_url, unidad_medida, stock, precio_costo, precio_venta, lista2, lista3, en_promocion, precio_promocion, activo, categoria_id, categorias(nombre)";

interface Categoria {
  id: string;
  nombre: string;
}

function money(n: number | null) {
  return n === null ? "—" : `$${n.toLocaleString("es-AR")}`;
}

export default function ProductosClient({ rol }: { rol: string }) {
  const [productos, setProductos] = useState<ProductoFila[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [termino, setTermino] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<ProductoFila | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("categorias")
      .select("id, nombre")
      .order("orden")
      .then(({ data }) => setCategorias((data as Categoria[]) ?? []));
  }, []);

  async function cargar() {
    const supabase = createClient();
    let query = supabase
      .from("productos")
      .select(SELECT, { count: "exact" })
      .order("detalle");

    if (termino.trim().length >= 2) {
      query = query.or(
        `codigo.ilike.%${termino}%,detalle.ilike.%${termino}%,familia.ilike.%${termino}%,marca.ilike.%${termino}%`
      );
    }
    if (categoriaId) {
      query = query.eq("categoria_id", categoriaId);
    }

    const desde = pagina * POR_PAGINA;
    query = query.range(desde, desde + POR_PAGINA - 1);

    const { data, count, error: err } = await query;
    if (err) {
      setError(err.message);
      setCargando(false);
      return;
    }
    setProductos((data as unknown as ProductoFila[]) ?? []);
    setTotal(count ?? 0);
    setCargando(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      cargar();
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termino, categoriaId, pagina]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl uppercase text-[#efe9df]">Productos</h1>
        <p className="text-sm text-[#a89a89]">
          {total} producto{total === 1 ? "" : "s"} en el catálogo.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={termino}
          onChange={(e) => {
            setTermino(e.target.value);
            setPagina(0);
          }}
          placeholder="Buscar por código, detalle, familia o marca..."
          className="max-w-sm flex-1 rounded-lg border border-[#2a2216] bg-[#151109] px-4 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
        />
        <select
          value={categoriaId}
          onChange={(e) => {
            setCategoriaId(e.target.value);
            setPagina(0);
          }}
          className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
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
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Detalle</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Unidad</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Costo</th>
              <th className="px-3 py-2">Venta</th>
              <th className="px-3 py-2">Lista 2</th>
              <th className="px-3 py-2">Lista 3</th>
              <th className="px-3 py-2">Promoción</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr
                key={p.id}
                onClick={() => setEditando(p)}
                className="cursor-pointer border-t border-[#2a2216] hover:bg-[#151109]"
              >
                <td className="px-3 py-2 whitespace-nowrap">{p.codigo}</td>
                <td className="px-3 py-2">{p.detalle}</td>
                <td className="px-3 py-2">{p.categorias?.nombre ?? "—"}</td>
                <td className="px-3 py-2">{p.unidad_medida}</td>
                <td className="px-3 py-2">{p.stock}</td>
                <td className="px-3 py-2">{money(p.precio_costo)}</td>
                <td className="px-3 py-2">{money(p.precio_venta)}</td>
                <td className="px-3 py-2">{money(p.lista2)}</td>
                <td className="px-3 py-2">{money(p.lista3)}</td>
                <td className="px-3 py-2">
                  {p.en_promocion ? (
                    <span className="rounded-full bg-[#f7c948]/20 px-2 py-0.5 text-xs font-bold text-[#f7c948]">
                      {p.precio_promocion ? `$${p.precio_promocion.toLocaleString("es-AR")}` : "Sí"}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!cargando && productos.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-sm text-[#a89a89]">
                  No hay productos con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-[#a89a89]">
        <button
          type="button"
          disabled={pagina === 0}
          onClick={() => setPagina((p) => Math.max(0, p - 1))}
          className="rounded-lg border border-[#2a2216] px-3 py-1.5 font-semibold disabled:opacity-40"
        >
          ← Anterior
        </button>
        <span>
          Página {pagina + 1} de {totalPaginas}
        </span>
        <button
          type="button"
          disabled={pagina + 1 >= totalPaginas}
          onClick={() => setPagina((p) => p + 1)}
          className="rounded-lg border border-[#2a2216] px-3 py-1.5 font-semibold disabled:opacity-40"
        >
          Siguiente →
        </button>
      </div>

      {editando && (
        <ProductoEditModal
          producto={editando}
          rol={rol}
          onClose={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}
