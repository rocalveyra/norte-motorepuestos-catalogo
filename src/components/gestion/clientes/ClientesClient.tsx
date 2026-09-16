"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { descargarCSV } from "@/lib/csv";
import ClienteFormModal, { type Cliente } from "@/components/gestion/clientes/ClienteFormModal";
import HistorialComprasModal from "@/components/gestion/clientes/HistorialComprasModal";

export default function ClientesClient({ rol }: { rol: string }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [compras, setCompras] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [termino, setTermino] = useState("");

  const [formulario, setFormulario] = useState<Cliente | "nuevo" | null>(null);
  const [historial, setHistorial] = useState<Cliente | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);

  async function cargar() {
    const supabase = createClient();
    let query = supabase
      .from("clientes")
      .select("id, nombre, telefono, dni, direccion")
      .order("nombre");

    if (termino.trim().length >= 2) {
      query = query.or(
        `nombre.ilike.%${termino}%,telefono.ilike.%${termino}%,dni.ilike.%${termino}%`
      );
    }

    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
      setCargando(false);
      return;
    }
    const lista = (data as Cliente[]) ?? [];
    setClientes(lista);

    if (lista.length > 0) {
      const { data: ventas } = await supabase
        .from("movimientos_stock")
        .select("cliente_id")
        .eq("tipo", "venta")
        .in(
          "cliente_id",
          lista.map((c) => c.id)
        );
      const conteo: Record<string, number> = {};
      for (const v of (ventas as { cliente_id: string | null }[]) ?? []) {
        if (!v.cliente_id) continue;
        conteo[v.cliente_id] = (conteo[v.cliente_id] ?? 0) + 1;
      }
      setCompras(conteo);
    } else {
      setCompras({});
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

  async function borrar(cliente: Cliente) {
    if (
      !window.confirm(
        `Esta acción no se puede deshacer. ¿Confirmás que querés borrar a "${cliente.nombre}"?`
      )
    ) {
      return;
    }
    setBorrando(cliente.id);
    setErrorBorrado(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("clientes").delete().eq("id", cliente.id);
    setBorrando(null);
    if (err) {
      setErrorBorrado(
        err.message.includes("foreign key")
          ? "No se puede borrar: este cliente tiene compras registradas."
          : err.message
      );
      return;
    }
    cargar();
  }

  function exportarCSV() {
    const encabezado = ["Nombre", "Teléfono", "DNI", "Dirección", "Compras"];
    const filas = clientes.map((c) => [
      c.nombre,
      c.telefono ?? "",
      c.dni ?? "",
      c.direccion ?? "",
      String(compras[c.id] ?? 0),
    ]);
    descargarCSV(`clientes_${new Date().toISOString().slice(0, 10)}.csv`, encabezado, filas);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl uppercase text-[#efe9df]">Clientes</h1>
          <p className="text-sm text-[#a89a89]">
            Listado, búsqueda e historial de compras de cada cliente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormulario("nuevo")}
          className="rounded-lg bg-[#f2891f] px-4 py-2 text-sm font-bold text-[#0a0a0a] transition hover:brightness-110"
        >
          + Cliente nuevo
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="Buscar por nombre, teléfono o DNI..."
          className="max-w-sm flex-1 rounded-lg border border-[#2a2216] bg-[#151109] px-4 py-2 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
        />
        <button
          type="button"
          onClick={exportarCSV}
          disabled={clientes.length === 0}
          className="rounded-lg border border-[#f7c948] px-4 py-2 text-xs font-bold text-[#f7c948] transition hover:bg-[#f7c948]/10 disabled:opacity-40"
        >
          Exportar CSV
        </button>
      </div>

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
              <th className="px-3 py-2">Teléfono</th>
              <th className="px-3 py-2">DNI</th>
              <th className="px-3 py-2">Dirección</th>
              <th className="px-3 py-2">Compras</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr
                key={c.id}
                onClick={() => setHistorial(c)}
                className="cursor-pointer border-t border-[#2a2216] hover:bg-[#151109]"
              >
                <td className="px-3 py-2">{c.nombre}</td>
                <td className="px-3 py-2">{c.telefono ?? "—"}</td>
                <td className="px-3 py-2">{c.dni ?? "—"}</td>
                <td className="px-3 py-2">{c.direccion ?? "—"}</td>
                <td className="px-3 py-2">{compras[c.id] ?? 0}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormulario(c);
                      }}
                      className="text-xs font-semibold text-[#f7c948] hover:underline"
                    >
                      Editar
                    </button>
                    {rol === "admin" && (
                      <button
                        type="button"
                        disabled={borrando === c.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          borrar(c);
                        }}
                        className="text-xs font-semibold text-[#d62828] hover:underline disabled:opacity-40"
                      >
                        {borrando === c.id ? "Borrando..." : "Borrar"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!cargando && clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-[#a89a89]">
                  No hay clientes con esta búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formulario && (
        <ClienteFormModal
          cliente={formulario === "nuevo" ? null : formulario}
          onClose={() => setFormulario(null)}
          onGuardado={() => {
            setFormulario(null);
            cargar();
          }}
        />
      )}

      {historial && (
        <HistorialComprasModal
          clienteId={historial.id}
          clienteNombre={historial.nombre}
          onClose={() => setHistorial(null)}
        />
      )}
    </div>
  );
}
