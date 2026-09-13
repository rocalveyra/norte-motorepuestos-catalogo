import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GestionShell from "@/components/gestion/GestionShell";

export default async function ProtectedGestionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/gestion/login");
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, rol, activo")
    .eq("id", user.id)
    .single();

  if (!perfil || !perfil.activo) {
    redirect("/gestion/login");
  }

  return (
    <GestionShell nombre={perfil.nombre} rol={perfil.rol}>
      {children}
    </GestionShell>
  );
}
