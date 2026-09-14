import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientesClient from "@/components/gestion/clientes/ClientesClient";

export default async function ClientesPage() {
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

  return <ClientesClient rol={perfil?.rol ?? "empleado"} />;
}
