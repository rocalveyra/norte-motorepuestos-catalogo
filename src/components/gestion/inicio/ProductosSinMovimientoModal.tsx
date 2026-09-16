"use client";

export interface ProductoSinMovimiento {
  codigo: string;
  detalle: string;
  stock: number;
  valor: number;
}

export default function ProductosSinMovimientoModal({
  productos,
  onClose,
}: {
  productos: ProductoSinMovimiento[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#2a2216] bg-[#111111] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="font-display text-lg uppercase text-[#efe9df]">
            Productos sin ventas en 90 días
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#2a2216] px-2 py-1 text-sm"
          >
            ✕
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[#a89a89]">
              <tr>
                <th className="px-2 py-2">Código</th>
                <th className="px-2 py-2">Detalle</th>
                <th className="px-2 py-2">Stock</th>
                <th className="px-2 py-2">Valor a costo</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.codigo} className="border-t border-[#2a2216]">
                  <td className="px-2 py-2 whitespace-nowrap">{p.codigo}</td>
                  <td className="px-2 py-2">{p.detalle}</td>
                  <td className="px-2 py-2">{p.stock}</td>
                  <td className="px-2 py-2">${p.valor.toLocaleString("es-AR")}</td>
                </tr>
              ))}
              {productos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-center text-[#a89a89]">
                    No hay productos sin movimiento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
