import WhatsAppButton from "./WhatsAppButton";

export default function BusinessInfo() {
  return (
    <section className="grid gap-4 sm:grid-cols-[1.3fr_1fr]">
      <div className="rounded-2xl border border-edge bg-surface p-6">
        <h4 className="font-display text-lg text-gold">
          Repuestos de motos en Tucumán
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Stock permanente y el repuesto que buscás, en el día. Atendemos a
          talleres, mecánicos y particulares con precios de mayorista y
          minorista.
        </p>
        <div className="mt-4">
          <WhatsAppButton producto="una consulta general" />
        </div>
      </div>

      <div className="rounded-2xl border border-edge bg-surface p-6">
        <h4 className="font-display text-lg text-gold">Datos del local</h4>
        <ul className="mt-3 flex flex-col gap-3 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-orange">📍</span>
            <span>Crisóstomo Álvarez 1950, San Miguel de Tucumán, Tucumán</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange">🕒</span>
            <span>Lunes a viernes, 9:30 a 19 hs</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange">📷</span>
            <span>
              Instagram:{" "}
              <a
                href="https://instagram.com/norterepuestos.tuc"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-edge bg-surface-2 px-2 py-0.5 text-cream hover:border-gold"
              >
                @norterepuestos.tuc
              </a>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange">👍</span>
            <span>
              Facebook:{" "}
              <span className="rounded-full border border-edge bg-surface-2 px-2 py-0.5 text-cream">
                Nortemotorepuestostuc North
              </span>
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
