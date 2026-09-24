export const fmt = (v: number, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

// Dias de hoje até uma data AAAA-MM-DD (negativo = já passou).
export function diasAte(iso: string): number {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.round((new Date(`${iso}T00:00:00`).getTime() - hoje.getTime()) / 86_400_000);
}
