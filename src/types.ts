export interface Categoria {
  id: string;
  nombre: string;
  imagen_generica_url: string | null;
  orden: number;
}

export interface Producto {
  id: string;
  codigo: string;
  detalle: string;
  descripcion: string | null;
  familia: string | null;
  categoria_id: string | null;
  marca: string | null;
  precio_venta: number;
  stock: number;
  foto_url: string | null;
  activo: boolean;
  en_promocion: boolean;
  categorias: { nombre: string } | null;
}
