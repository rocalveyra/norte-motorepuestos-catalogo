import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Producto } from "@/types";
import WhatsAppButton from "@/components/WhatsAppButton";

export const revalidate = 0;

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;

  const { data: producto } = await supabase
    .from("productos")
    .select(
      "id, codigo, detalle, descripcion, familia, categoria_id, marca, precio_venta, stock, foto_url, activo, en_promocion, categorias(nombre)"
    )
    .eq("codigo", codigo)
    .eq("activo", true)
    .single();

  if (!producto) {
    notFound();
  }

  const p = producto as unknown as Producto;
  const sinStock = p.stock <= 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <Link href="/" className="text-sm text-muted hover:text-gold">
        ← Volver al catálogo
      </Link>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="relative flex aspect-square w-full items-center justify-center rounded-xl border border-edge bg-black/40 text-6xl sm:w-64 sm:shrink-0">
          {p.en_promocion && (
            <span className="absolute left-3 top-3 rounded-md bg-red px-2 py-0.5 font-condensed text-xs font-bold tracking-wide text-cream shadow">
              OFERTA
            </span>
          )}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(246,185,59,0.16),transparent_65%)]" />
          <span className="relative">🔧</span>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <span className="font-condensed text-xs font-semibold uppercase tracking-wide text-muted">
            {p.categorias?.nombre ?? "Sin categoría"} · Código: {p.codigo}
          </span>
          <h1 className="font-display text-xl uppercase text-cream">{p.detalle}</h1>
          {p.marca && <p className="text-sm text-muted">Marca: {p.marca}</p>}
          {p.descripcion && <p className="text-sm text-cream/90">{p.descripcion}</p>}

          <p className="text-2xl font-extrabold tabular-nums text-gold">
            ${p.precio_venta.toLocaleString("es-AR")}
          </p>
          <p className={`text-sm font-semibold ${sinStock ? "text-red" : "text-green"}`}>
            {sinStock ? "Sin stock" : `Stock disponible: ${p.stock}`}
          </p>

          <div className="mt-2">
            <WhatsAppButton producto={p.detalle} />
          </div>
        </div>
      </div>
    </div>
  );
}
