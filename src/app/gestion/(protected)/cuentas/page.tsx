import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CuentasClient from "@/components/gestion/cuentas/CuentasClient";

export default async function CuentasPage() {
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

  return <CuentasClient />;
}
