const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

export default function WhatsAppButton({ producto }: { producto: string }) {
  const mensaje = encodeURIComponent(`Hola, quería consultar por: ${producto}`);
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensaje}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
    >
      Consultar por WhatsApp
    </a>
  );
}
