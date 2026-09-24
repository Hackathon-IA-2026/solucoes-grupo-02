export function PageHead({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-[27px] font-bold">{titulo}</h1>
      <p className="mt-1.5 max-w-[66ch] text-[14.5px] text-ink-2">{texto}</p>
    </div>
  );
}
