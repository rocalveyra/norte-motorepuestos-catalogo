import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/gestion/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, rol")
    .eq("id", user.id)
    .single();

  if (!perfil) redirect("/gestion/login");

  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-2xl uppercase text-[#efe9df]">Inicio</h1>
      <p className="text-sm text-[#a89a89]">
        Hola, {perfil.nombre} — rol: {perfil.rol}
      </p>
    </div>
  );
}
