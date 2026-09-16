import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerAdminActual } from "@/lib/auth/verificarAdmin";

export async function GET() {
  const admin = await obtenerAdminActual();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: perfiles, error: errPerfiles } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, activo")
    .order("nombre");

  if (errPerfiles) {
    return NextResponse.json({ error: errPerfiles.message }, { status: 500 });
  }

  const { data: usuariosAuth, error: errAuth } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
  });
  if (errAuth) {
    return NextResponse.json({ error: errAuth.message }, { status: 500 });
  }
  const emailPorId = new Map(usuariosAuth.users.map((u) => [u.id, u.email ?? ""]));

  const usuarios = (perfiles ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    rol: p.rol,
    activo: p.activo,
    email: emailPorId.get(p.id) ?? "",
  }));

  return NextResponse.json({ usuarios });
}

export async function POST(request: Request) {
  const admin = await obtenerAdminActual();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const rol = body?.rol;
  const password = typeof body?.password === "string" ? body.password : "";

  if (!nombre || !email || (rol !== "admin" && rol !== "empleado") || password.length < 8) {
    return NextResponse.json(
      {
        error:
          "Datos inválidos: revisá nombre, email, rol, y que la contraseña tenga al menos 8 caracteres.",
      },
      { status: 400 }
    );
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data: nuevoUsuario, error: errCrear } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (errCrear || !nuevoUsuario.user) {
    return NextResponse.json(
      { error: errCrear?.message ?? "No se pudo crear el usuario." },
      { status: 400 }
    );
  }

  const { error: errPerfil } = await adminClient.from("perfiles").insert({
    id: nuevoUsuario.user.id,
    nombre,
    rol,
    activo: true,
  });

  if (errPerfil) {
    const { error: errRollback } = await adminClient.auth.admin.deleteUser(nuevoUsuario.user.id);
    if (errRollback) {
      return NextResponse.json(
        {
          error: `Se creó el usuario en Auth (email ${email}, id ${nuevoUsuario.user.id}) pero falló la creación del perfil (${errPerfil.message}), y no se pudo revertir automáticamente (${errRollback.message}). Necesita revisión manual desde el dashboard de Supabase.`,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: `No se pudo crear el perfil (${errPerfil.message}). Se revirtió la creación de la cuenta.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: nuevoUsuario.user.id });
}
