export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mb-3.5 inline-flex items-center gap-1.5 py-1 text-[13px] font-medium text-ink-2 hover:text-brand">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      Voltar para entrar
    </button>
  );
}
