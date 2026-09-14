"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import VincularProveedorInline from "@/components/gestion/proveedores/VincularProveedorInline";

interface Vinculo {
  proveedor_id: string;
  es_preferido: boolean;
  proveedores: { nombre: string } | null;
}

export default function ProductoProveedoresManager({ productoId }: { productoId: string }) {
  const [vinculados, setVinculados] = useState<Vinculo[] | null>(null);

  async function cargar() {
    const supabase = createClient();
    const { data } = await supabase
      .from("producto_proveedores")
      .select("proveedor_id, es_preferido, proveedores(nombre)")
      .eq("producto_id", productoId)
      .order("es_preferido", { ascending: false });
    setVinculados((data as unknown as Vinculo[]) ?? []);
  }

  useEffect(() => {
    const timeout = setTimeout(() => cargar(), 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId]);

  async function quitar(proveedorId: string) {
    const supabase = createClient();
    await supabase
      .from("producto_proveedores")
      .delete()
      .eq("producto_id", productoId)
      .eq("proveedor_id", proveedorId);
    cargar();
  }

  async function marcarPreferido(proveedorId: string) {
    const supabase = createClient();
    await supabase
      .from("producto_proveedores")
      .update({ es_preferido: false })
      .eq("producto_id", productoId);
    await supabase
      .from("producto_proveedores")
      .update({ es_preferido: true })
      .eq("producto_id", productoId)
      .eq("proveedor_id", proveedorId);
    cargar();
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-[#a89a89]">
        Proveedores
      </label>

      {vinculados === null && <p className="text-sm text-[#a89a89]">Cargando...</p>}

      {vinculados !== null &&
        vinculados.map((v) => (
          <div
            key={v.proveedor_id}
            className="flex items-center justify-between rounded-lg border border-[#2a2216] bg-[#151109] px-3 py-2"
          >
            <span className="text-sm text-[#efe9df]">{v.proveedores?.nombre}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => marcarPreferido(v.proveedor_id)}
                className={`text-xs font-semibold ${
                  v.es_preferido ? "text-[#f7c948]" : "text-[#a89a89] hover:text-[#f7c948]"
                }`}
              >
                {v.es_preferido ? "★ Preferido" : "Marcar preferido"}
              </button>
              <button
                type="button"
                onClick={() => quitar(v.proveedor_id)}
                className="text-xs font-semibold text-[#d62828] hover:underline"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}

      {vinculados !== null && vinculados.length === 0 && (
        <p className="text-xs text-[#a89a89]">Todavía no tiene proveedores vinculados.</p>
      )}

      <VincularProveedorInline
        productoId={productoId}
        idsExcluir={(vinculados ?? []).map((v) => v.proveedor_id)}
        esPreferido={(vinculados ?? []).length === 0}
        onVinculado={cargar}
      />
    </div>
  );
}
