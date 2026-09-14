"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import VincularProveedorInline from "@/components/gestion/proveedores/VincularProveedorInline";

interface ProveedorVinculado {
  proveedor_id: string;
  es_preferido: boolean;
  proveedores: { nombre: string } | null;
}

export default function ProveedorSelectorCompra({
  productoId,
  value,
  onChange,
}: {
  productoId: string;
  value: string;
  onChange: (proveedorId: string) => void;
}) {
  const [vinculados, setVinculados] = useState<ProveedorVinculado[] | null>(null);

  async function cargar() {
    const supabase = createClient();
    const { data } = await supabase
      .from("producto_proveedores")
      .select("proveedor_id, es_preferido, proveedores(nombre)")
      .eq("producto_id", productoId)
      .order("es_preferido", { ascending: false });
    const lista = (data as unknown as ProveedorVinculado[]) ?? [];
    setVinculados(lista);
    if (lista.length > 0 && !lista.some((v) => v.proveedor_id === value)) {
      onChange(lista[0].proveedor_id);
    }
    if (lista.length === 0 && value !== "") {
      onChange("");
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => cargar(), 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
        Proveedor (obligatorio)
      </label>
      {vinculados === null && <p className="text-sm text-[#a89a89]">Cargando proveedores...</p>}
      {vinculados !== null && vinculados.length > 0 && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
        >
          {vinculados.map((v) => (
            <option key={v.proveedor_id} value={v.proveedor_id}>
              {v.proveedores?.nombre}
              {v.es_preferido ? " (preferido)" : ""}
            </option>
          ))}
        </select>
      )}
      {vinculados !== null && vinculados.length === 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-[#d62828] bg-[#d62828]/10 p-3">
          <p className="text-sm font-semibold text-[#d62828]">
            Este producto todavía no tiene proveedores vinculados. Vinculá uno para poder
            cargar la compra.
          </p>
          <VincularProveedorInline
            productoId={productoId}
            idsExcluir={[]}
            esPreferido={true}
            onVinculado={cargar}
          />
        </div>
      )}
    </div>
  );
}
