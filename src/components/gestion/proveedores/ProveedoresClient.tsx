"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ProveedorFormModal, { type Proveedor } from "@/components/gestion/proveedores/ProveedorFormModal";
import HistorialComprasProveedorModal from "@/components/gestion/proveedores/HistorialComprasProveedorModal";

export default function ProveedoresClient({ rol }: { rol: string }) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productosPorProveedor, setProductosPorProveedor] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [termino, setTermino] = useState("");

  const [formulario, setFormulario] = useState<Proveedor | "nuevo" | null>(null);
  const [historial, setHistorial] = useState<Proveedor | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);

  async function cargar() {
    const supabase = createClient();
    let query = supabase
      .from("proveedores")
      .select("id, nombre, contacto, email, direccion, notas")
      .order("nombre");

    if (termino.trim().length >= 2) {
      query = query.ilike("nombre", `%${termino}%`);
    }

    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
      setCargando(false);
      return;
    }
    const lista = (data as Proveedor[]) ?? [];
    setProveedores(lista);

    if (lista.length > 0) {
      const { data: vinculos } = await supabase
        .from("producto_proveedores")
        .select("proveedor_id")
        .in(
          "proveedor_id",
          lista.map((p) => p.id)
        );
      const conteo: Record<string, number> = {};
      for (const v of (vinculos as { proveedor_id: string }[]) ?? []) {
        conteo[v.proveedor_id] = (conteo[v.proveedor_id] ?? 0) + 1;
      }
      setProductosPorProveedor(conteo);
    } else {
      setProductosPorProveedor({});
    }
    setCargando(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      cargar();
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termino]);

  async function borrar(proveedor: Proveedor) {
    if (
      !window.confirm(
        `Esta acción no se puede deshacer. ¿Confirmás que querés borrar a "${proveedor.nombre}"?`
      )
    ) {
      return;
    }
    setBorrando(proveedor.id);
    setErrorBorrado(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("proveedores").delete().eq("id", proveedor.id);
    setBorrando(null);
    if (err) {
      setErrorBorrado(err.message);
      return;
    }
    cargar();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl uppercase text-[#efe9df]">Proveedores</h1>
          <p className="text-sm text-[#a89a89]">
            Listado, búsqueda e historial de compras a cada proveedor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormulario("nuevo")}
          className="rounded-lg bg-[#f2891f] px-4 py-2 text-sm font-bold text-[#0a0a0a] transition hover:brightness-110"
        >
          + Proveedor nuevo
        </button>
      </div>

      <input
        type="text"
        value={termino}
        onChange={(e) => setTermino(e.target.value)}
        placeholder="Buscar por nombre..."
        className="max-w-sm rounded-lg border border-[#2a2216] bg-[#151109] px-4 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
      />

      {error && (
        <p className="rounded-lg border border-[#d62828] bg-[#d62828]/10 px-4 py-2 text-sm text-[#d62828]">
          {error}
        </p>
      )}
      {errorBorrado && (
        <p className="rounded-lg border border-[#d62828] bg-[#d62828]/10 px-4 py-2 text-sm text-[#d62828]">
          {errorBorrado}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-[#2a2216]">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-[#151109] text-xs uppercase tracking-wide text-[#a89a89]">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Contacto</th>
              <th className="px-3 py-2">Productos</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map((p) => (
              <tr
                key={p.id}
                onClick={() => setHistorial(p)}
                className="cursor-pointer border-t border-[#2a2216] hover:bg-[#151109]"
              >
                <td className="px-3 py-2">{p.nombre}</td>
                <td className="px-3 py-2">{p.contacto ?? "—"}</td>
                <td className="px-3 py-2">{productosPorProveedor[p.id] ?? 0}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormulario(p);
                      }}
                      className="text-xs font-semibold text-[#f7c948] hover:underline"
                    >
                      Editar
                    </button>
                    {rol === "admin" && (
                      <button
                        type="button"
                        disabled={borrando === p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          borrar(p);
                        }}
                        className="text-xs font-semibold text-[#d62828] hover:underline disabled:opacity-40"
                      >
                        {borrando === p.id ? "Borrando..." : "Borrar"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!cargando && proveedores.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-[#a89a89]">
                  No hay proveedores con esta búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formulario && (
        <ProveedorFormModal
          proveedor={formulario === "nuevo" ? null : formulario}
          onClose={() => setFormulario(null)}
          onGuardado={() => {
            setFormulario(null);
            cargar();
          }}
        />
      )}

      {historial && (
        <HistorialComprasProveedorModal
          proveedorId={historial.id}
          proveedorNombre={historial.nombre}
          onClose={() => setHistorial(null)}
        />
      )}
    </div>
  );
}
