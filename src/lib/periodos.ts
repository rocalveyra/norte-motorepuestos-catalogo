export type PeriodoTipo = "hoy" | "semana" | "mes" | "personalizado";

export interface Rango {
  desde: Date;
  hasta: Date;
}

export function calcularRango(
  tipo: PeriodoTipo,
  personalizadoDesde?: string,
  personalizadoHasta?: string
): Rango {
  const ahora = new Date();

  if (tipo === "personalizado" && personalizadoDesde && personalizadoHasta) {
    return {
      desde: new Date(`${personalizadoDesde}T00:00:00`),
      hasta: new Date(`${personalizadoHasta}T23:59:59.999`),
    };
  }

  if (tipo === "hoy") {
    const desde = new Date(ahora);
    desde.setHours(0, 0, 0, 0);
    return { desde, hasta: ahora };
  }

  if (tipo === "semana") {
    const desde = new Date(ahora);
    const dia = desde.getDay();
    const diffLunes = dia === 0 ? 6 : dia - 1;
    desde.setDate(desde.getDate() - diffLunes);
    desde.setHours(0, 0, 0, 0);
    return { desde, hasta: ahora };
  }

  // mes en curso
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
  return { desde, hasta: ahora };
}

/** Período inmediatamente anterior, de la misma duración. */
export function rangoAnterior(rango: Rango): Rango {
  const duracionMs = rango.hasta.getTime() - rango.desde.getTime();
  const hasta = new Date(rango.desde.getTime() - 1);
  const desde = new Date(hasta.getTime() - duracionMs);
  return { desde, hasta };
}
