import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductosClient from "@/components/gestion/productos/ProductosClient";

export default async function ProductosPage() {
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

  return <ProductosClient rol={perfil?.rol ?? "empleado"} />;
}
