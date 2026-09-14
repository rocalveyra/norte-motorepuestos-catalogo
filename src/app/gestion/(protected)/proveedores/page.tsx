import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProveedoresClient from "@/components/gestion/proveedores/ProveedoresClient";

export default async function ProveedoresPage() {
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

  return <ProveedoresClient rol={perfil?.rol ?? "empleado"} />;
}
