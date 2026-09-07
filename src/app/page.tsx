import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Categoria, Producto } from "@/types";
import ProductCard from "@/components/ProductCard";

export const revalidate = 0;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>;
}) {
  const { q, categoria } = await searchParams;

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre, imagen_generica_url, orden")
    .order("orden");

  let query = supabase
    .from("productos")
    .select(
      "id, codigo, detalle, descripcion, familia, categoria_id, marca, precio_venta, stock, foto_url, activo, categorias(nombre)"
    )
    .eq("activo", true)
    .order("detalle");

  if (q) {
    query = query.or(
      `detalle.ilike.%${q}%,codigo.ilike.%${q}%,marca.ilike.%${q}%`
    );
  }
  if (categoria) {
    query = query.eq("categoria_id", categoria);
  }

  const { data: productos, error } = await query;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Norte Motorepuestos</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Catálogo de repuestos para motos — consultá stock y precios
        </p>
      </header>

      <form className="flex flex-col gap-3 sm:flex-row" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, código o marca..."
          className="flex-1 rounded-lg border border-black/15 bg-white px-4 py-2 text-sm outline-none focus:border-black/40 dark:border-white/15 dark:bg-white/5 dark:focus:border-white/40"
        />
        {categoria && <input type="hidden" name="categoria" value={categoria} />}
        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Buscar
        </button>
      </form>

      <nav className="flex flex-wrap gap-2">
        <Link
          href={q ? `/?q=${encodeURIComponent(q)}` : "/"}
          className={`rounded-full border px-3 py-1 text-sm transition ${
            !categoria
              ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
              : "border-black/15 hover:border-black/40 dark:border-white/15 dark:hover:border-white/40"
          }`}
        >
          Todas
        </Link>
        {categorias?.map((cat: Categoria) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          params.set("categoria", cat.id);
          const isActive = categoria === cat.id;
          return (
            <Link
              key={cat.id}
              href={`/?${params.toString()}`}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                isActive
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-black/15 hover:border-black/40 dark:border-white/15 dark:hover:border-white/40"
              }`}
            >
              {cat.nombre}
            </Link>
          );
        })}
      </nav>

      {error && (
        <p className="text-sm text-red-600">
          Ocurrió un error al cargar los productos: {error.message}
        </p>
      )}

      {!error && productos && productos.length === 0 && (
        <p className="text-sm text-black/60 dark:text-white/60">
          No se encontraron productos con esos criterios.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {productos?.map((producto) => (
          <ProductCard key={producto.id} producto={producto as unknown as Producto} />
        ))}
      </div>
    </div>
  );
}
