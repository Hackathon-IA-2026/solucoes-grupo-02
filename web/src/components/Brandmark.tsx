export function Brandmark({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center gap-3 ${className ?? ''}`}>
      <svg viewBox="0 0 40 40" aria-hidden="true" className="h-[38px] w-[38px] shrink-0">
        <path d="M6 16.5A14.5 14.5 0 0 1 28 8.4" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M23.4 5.6 29 8.6l-2.2 5.8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M34 23.5A14.5 14.5 0 0 1 12 31.6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M16.6 34.4 11 31.4l2.2-5.8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22.6 10.5 14.5 21.8h5l-2.3 8.4 8.6-11.9h-5.2z" fill="#EFA134" />
      </svg>
      <div className="font-display text-[22px] font-extrabold leading-none tracking-[-.02em]">
        Energy<span className="text-accent">Start</span>
      </div>
    </div>
  );
}
