export default function Placeholder({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-2xl uppercase text-[#efe9df]">{titulo}</h1>
      <p className="text-sm text-[#a89a89]">Próximamente</p>
    </div>
  );
}
