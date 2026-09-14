export const NAV_ITEMS = [
  { href: "/gestion", label: "Inicio", adminOnly: false },
  { href: "/gestion/productos", label: "Productos", adminOnly: false },
  { href: "/gestion/movimientos", label: "Movimientos", adminOnly: false },
  { href: "/gestion/cuentas", label: "Cuentas", adminOnly: true },
  { href: "/gestion/proveedores", label: "Proveedores", adminOnly: false },
  { href: "/gestion/clientes", label: "Clientes", adminOnly: false },
] as const;
