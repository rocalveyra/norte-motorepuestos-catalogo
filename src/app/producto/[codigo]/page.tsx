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
      "id, codigo, detalle, descripcion, familia, categoria_id, marca, precio_venta, stock, foto_url, activo, categorias(nombre)"
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
      <Link href="/" className="text-sm text-black/60 hover:underline dark:text-white/60">
        ← Volver al catálogo
      </Link>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-black/5 text-6xl sm:w-64 sm:shrink-0 dark:bg-white/10">
          🔧
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <span className="text-xs text-black/50 dark:text-white/50">
            {p.categorias?.nombre ?? "Sin categoría"} · Código: {p.codigo}
          </span>
          <h1 className="text-xl font-bold">{p.detalle}</h1>
          {p.marca && (
            <p className="text-sm text-black/60 dark:text-white/60">Marca: {p.marca}</p>
          )}
          {p.descripcion && <p className="text-sm">{p.descripcion}</p>}

          <p className="text-2xl font-semibold">
            ${p.precio_venta.toLocaleString("es-AR")}
          </p>
          <p className={`text-sm font-medium ${sinStock ? "text-red-600" : "text-green-700"}`}>
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
