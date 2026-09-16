import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CajaClient from "@/components/gestion/caja/CajaClient";

export default async function CajaPage() {
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

  return <CajaClient rol={perfil?.rol ?? "empleado"} />;
}
