import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UsuariosClient from "@/components/gestion/usuarios/UsuariosClient";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/gestion/login");
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (perfil?.rol !== "admin") {
    redirect("/gestion");
  }

  return <UsuariosClient usuarioActualId={user.id} />;
}
