export function Switch({ ativo, onToggle, label }: { ativo: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      aria-label={label}
      onClick={onToggle}
      className="relative h-6 w-[42px] shrink-0 rounded-full bg-line-strong transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_3px_rgba(0,0,0,.3)] after:transition-transform after:content-[''] aria-pressed:bg-ok aria-pressed:after:translate-x-[18px]"
    />
  );
}

export function SwitchRow({
  titulo,
  detalhe,
  ativo,
  onToggle,
}: {
  titulo: string;
  detalhe: string;
  ativo: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3.5 border-b border-line py-3 last:border-b-0">
      <div>
        <div className="text-sm font-medium">{titulo}</div>
        <div className="text-[12.8px] text-ink-3">{detalhe}</div>
      </div>
      <Switch ativo={ativo} onToggle={onToggle} label={titulo} />
    </div>
  );
}
