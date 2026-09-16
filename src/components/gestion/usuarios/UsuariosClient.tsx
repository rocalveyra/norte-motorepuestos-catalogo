"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NuevoUsuarioModal from "@/components/gestion/usuarios/NuevoUsuarioModal";
import ResetPasswordModal from "@/components/gestion/usuarios/ResetPasswordModal";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "empleado";
  activo: boolean;
}

export default function UsuariosClient({ usuarioActualId }: { usuarioActualId: string }) {
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [resetId, setResetId] = useState<Usuario | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [rolEdit, setRolEdit] = useState<"admin" | "empleado">("empleado");
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function cargar() {
    const res = await fetch("/api/admin/usuarios");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo cargar el listado de usuarios.");
      return;
    }
    setError(null);
    setUsuarios(data.usuarios as Usuario[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    cargar();
  }, []);

  function iniciarEdicion(u: Usuario) {
    setEditandoId(u.id);
    setNombreEdit(u.nombre);
    setRolEdit(u.rol);
    setMensaje(null);
  }

  async function guardarEdicion(u: Usuario) {
    setGuardandoEdit(true);
    const supabase = createClient();
    const payload: { nombre: string; rol?: "admin" | "empleado" } = { nombre: nombreEdit.trim() };
    if (u.id !== usuarioActualId) {
      payload.rol = rolEdit;
    }
    const { error: err } = await supabase.from("perfiles").update(payload).eq("id", u.id);
    setGuardandoEdit(false);
    if (err) {
      setMensaje(err.message);
      return;
    }
    setEditandoId(null);
    cargar();
  }

  async function toggleActivo(u: Usuario) {
    if (u.id === usuarioActualId) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from("perfiles")
      .update({ activo: !u.activo })
      .eq("id", u.id);
    if (err) {
      setMensaje(err.message);
      return;
    }
    cargar();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl uppercase text-[#efe9df]">Usuarios</h1>
          <p className="text-sm text-[#a89a89]">Cuentas de acceso al panel de gestión.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreando(true)}
          className="rounded-lg bg-[#f2891f] px-4 py-2 text-sm font-bold text-[#0a0a0a] transition hover:brightness-110"
        >
          + Nuevo usuario
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-[#d62828] bg-[#d62828]/10 px-4 py-2 text-sm text-[#d62828]">
          {error}
        </p>
      )}
      {mensaje && (
        <p className="rounded-lg border border-[#d62828] bg-[#d62828]/10 px-4 py-2 text-sm text-[#d62828]">
          {mensaje}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-[#2a2216]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[#151109] text-xs uppercase tracking-wide text-[#a89a89]">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios === null && !error && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-[#a89a89]">
                  Cargando...
                </td>
              </tr>
            )}
            {usuarios?.map((u) => {
              const esUnoMismo = u.id === usuarioActualId;
              const editando = editandoId === u.id;
              return (
                <tr
                  key={u.id}
                  className={`border-t border-[#2a2216] ${u.activo ? "" : "opacity-50"}`}
                >
                  <td className="px-3 py-2">
                    {editando ? (
                      <input
                        type="text"
                        value={nombreEdit}
                        onChange={(e) => setNombreEdit(e.target.value)}
                        className="rounded-lg border border-[#2a2216] bg-[#151109] px-2 py-1 text-sm text-[#efe9df] outline-none focus:border-[#f2891f]"
                      />
                    ) : (
                      u.nombre
                    )}
                  </td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2 capitalize">
                    {editando ? (
                      <select
                        value={rolEdit}
                        onChange={(e) => setRolEdit(e.target.value as "admin" | "empleado")}
                        disabled={esUnoMismo}
                        className="rounded-lg border border-[#2a2216] bg-[#151109] px-2 py-1 text-sm text-[#efe9df] outline-none focus:border-[#f2891f] disabled:opacity-50"
                      >
                        <option value="empleado">Empleado</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      u.rol
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {u.activo ? (
                      <span className="text-[#7cb464]">Activo</span>
                    ) : (
                      <span className="rounded-full bg-[#d62828]/20 px-2 py-0.5 text-xs font-bold text-[#d62828]">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {editando ? (
                        <>
                          <button
                            type="button"
                            disabled={guardandoEdit}
                            onClick={() => guardarEdicion(u)}
                            className="text-xs font-semibold text-[#7cb464] hover:underline"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoId(null)}
                            className="text-xs font-semibold text-[#a89a89] hover:underline"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(u)}
                          className="text-xs font-semibold text-[#f7c948] hover:underline"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={esUnoMismo}
                        onClick={() => toggleActivo(u)}
                        title={esUnoMismo ? "No podés desactivarte a vos mismo." : undefined}
                        className="text-xs font-semibold text-[#efe9df] hover:underline disabled:opacity-30 disabled:hover:no-underline"
                      >
                        {u.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetId(u)}
                        className="text-xs font-semibold text-[#d62828] hover:underline"
                      >
                        Resetear contraseña
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {creando && (
        <NuevoUsuarioModal
          onClose={() => setCreando(false)}
          onCreado={() => {
            setCreando(false);
            cargar();
          }}
        />
      )}

      {resetId && (
        <ResetPasswordModal
          usuarioId={resetId.id}
          usuarioNombre={resetId.nombre}
          onClose={() => setResetId(null)}
          onListo={() => setResetId(null)}
        />
      )}
    </div>
  );
}
