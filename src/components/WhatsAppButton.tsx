const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

export default function WhatsAppButton({ producto }: { producto: string }) {
  const mensaje = encodeURIComponent(`Hola, quería consultar por: ${producto}`);
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensaje}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3fa34d] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
    >
      Consultar por WhatsApp
    </a>
  );
}
