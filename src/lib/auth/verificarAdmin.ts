import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Confirma, del lado del servidor y con la sesión real de quien llama,
 * que el usuario logueado es un admin activo. No confiar en que el
 * frontend haya ocultado un botón — cada Route Handler que toque la
 * service role key tiene que pasar por acá primero.
 */
export async function obtenerAdminActual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, activo")
    .eq("id", user.id)
    .single();

  if (!perfil || perfil.rol !== "admin" || !perfil.activo) return null;

  return user;
}
