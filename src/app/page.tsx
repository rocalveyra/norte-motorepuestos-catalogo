import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Categoria, Producto } from "@/types";
import ProductCard from "@/components/ProductCard";
import BusinessInfo from "@/components/BusinessInfo";

export const revalidate = 0;

const PRODUCTO_SELECT =
  "id, codigo, detalle, descripcion, familia, categoria_id, marca, precio_venta, stock, foto_url, activo, en_promocion, categorias(nombre)";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>;
}) {
  const { q, categoria } = await searchParams;
  const esPromociones = categoria === "promo";

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre, imagen_generica_url, orden")
    .order("orden");

  let query = supabase
    .from("productos")
    .select(PRODUCTO_SELECT)
    .eq("activo", true)
    .order("detalle");

  if (q) {
    query = query.or(
      `detalle.ilike.%${q}%,codigo.ilike.%${q}%,marca.ilike.%${q}%`
    );
  }
  if (esPromociones) {
    query = query.eq("en_promocion", true);
  } else if (categoria) {
    query = query.eq("categoria_id", categoria);
  }

  const { data: productos, error } = await query;

  const linkParams = (extra: Record<string, string>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-10 pt-14 text-center sm:pt-16">
        <div
          className="pointer-events-none absolute left-1/2 top-6 h-[380px] w-[380px] -translate-x-1/2 rounded-full opacity-90 blur-[2px]"
          style={{
            background:
              "radial-gradient(circle at 50% 35%, var(--gold) 0%, var(--orange) 42%, var(--red) 70%, transparent 74%)",
          }}
        />
        <Image
          src="/norte-logo.jpg"
          alt="Norte Motorepuestos"
          width={140}
          height={140}
          priority
          className="relative mx-auto mb-4 rounded-xl shadow-2xl shadow-black/60"
        />
        <h1 className="font-display relative text-3xl uppercase text-cream sm:text-5xl">
          Norte Motorepuestos
        </h1>
        <p className="relative mt-2 text-sm font-semibold text-gold sm:text-base">
          Stock permanente, el repuesto que buscás, en el día
        </p>

        <form
          className="relative mx-auto mt-6 flex max-w-lg flex-col gap-2 sm:flex-row"
          method="get"
        >
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, código o marca..."
            className="flex-1 rounded-lg border border-edge bg-surface-2 px-4 py-2 text-sm text-cream outline-none placeholder:text-muted focus:border-gold"
          />
          {categoria && <input type="hidden" name="categoria" value={categoria} />}
          <button
            type="submit"
            className="rounded-lg bg-orange px-4 py-2 text-sm font-bold text-[#1a0f00] transition hover:brightness-110"
          >
            Buscar
          </button>
        </form>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-4 sm:p-8">
        {/* Categorías */}
        <nav className="flex flex-wrap gap-2">
          <Link
            href={linkParams({})}
            className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
              !categoria
                ? "border-cream bg-cream text-[#1a0f00]"
                : "border-edge bg-surface-2 text-cream hover:border-gold/60"
            }`}
          >
            Todas
          </Link>
          <Link
            href={linkParams({ categoria: "promo" })}
            style={{ background: "linear-gradient(90deg, var(--red), var(--orange))" }}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold text-[#1a0f00] transition hover:brightness-110 ${
              esPromociones ? "ring-2 ring-gold" : ""
            }`}
          >
            🔥 Promociones
          </Link>
          {categorias?.map((cat: Categoria) => {
            const isActive = categoria === cat.id;
            return (
              <Link
                key={cat.id}
                href={linkParams({ categoria: cat.id })}
                className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                  isActive
                    ? "border-cream bg-cream text-[#1a0f00]"
                    : "border-edge bg-surface-2 text-cream hover:border-gold/60"
                }`}
              >
                {cat.nombre}
              </Link>
            );
          })}
        </nav>

        {error && (
          <p className="text-sm text-red">
            Ocurrió un error al cargar los productos: {error.message}
          </p>
        )}

        {!error && productos && productos.length === 0 && (
          <p className="text-sm text-muted">
            {esPromociones
              ? "Todavía no hay productos marcados en promoción esta semana."
              : "No se encontraron productos con esos criterios."}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {productos?.map((producto) => (
            <ProductCard key={producto.id} producto={producto as unknown as Producto} />
          ))}
        </div>

        <BusinessInfo />
      </div>
    </div>
  );
}
