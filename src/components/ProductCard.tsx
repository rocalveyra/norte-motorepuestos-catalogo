import Link from "next/link";
import type { Producto } from "@/types";

export default function ProductCard({ producto }: { producto: Producto }) {
  const sinStock = producto.stock <= 0;

  return (
    <Link
      href={`/producto/${producto.codigo}`}
      className="relative flex flex-col overflow-hidden rounded-xl border border-edge bg-surface-2 transition hover:border-gold/60"
    >
      {producto.en_promocion && (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-red px-2 py-0.5 font-condensed text-[11px] font-bold tracking-wide text-cream shadow">
          OFERTA
        </span>
      )}
      <div className="relative flex aspect-square items-center justify-center bg-black/40 text-4xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(246,185,59,0.16),transparent_65%)]" />
        <span className="relative">🔧</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="font-condensed text-[11px] font-semibold uppercase tracking-wide text-muted">
          {producto.categorias?.nombre ?? "Sin categoría"}
        </span>
        <h3 className="line-clamp-2 min-h-[2.4em] text-sm text-cream">
          {producto.detalle}
        </h3>
        <p className="mt-auto text-lg font-extrabold tabular-nums text-gold">
          ${producto.precio_venta.toLocaleString("es-AR")}
        </p>
        <p
          className={`text-xs font-semibold ${sinStock ? "text-red" : "text-green"}`}
        >
          {sinStock ? "Sin stock" : `Stock: ${producto.stock}`}
        </p>
      </div>
    </Link>
  );
}
