import Link from "next/link";
import type { Producto } from "@/types";

export default function ProductCard({ producto }: { producto: Producto }) {
  const sinStock = producto.stock <= 0;

  return (
    <Link
      href={`/producto/${producto.codigo}`}
      className="flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white transition hover:shadow-md dark:border-white/10 dark:bg-white/5"
    >
      <div className="flex aspect-square items-center justify-center bg-black/5 text-4xl dark:bg-white/10">
        🔧
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-xs text-black/50 dark:text-white/50">
          {producto.categorias?.nombre ?? "Sin categoría"}
        </span>
        <h3 className="line-clamp-2 text-sm font-medium">{producto.detalle}</h3>
        <p className="mt-auto text-lg font-semibold">
          ${producto.precio_venta.toLocaleString("es-AR")}
        </p>
        <p className={`text-xs ${sinStock ? "text-red-600" : "text-green-700"}`}>
          {sinStock ? "Sin stock" : `Stock: ${producto.stock}`}
        </p>
      </div>
    </Link>
  );
}
