// Mesma normalização de CEG da API (api/src/utils/ceg.ts).
export function normalizarCeg(valor: string): string | undefined {
    const m = valor.toUpperCase().match(/\b([A-Z]{3})\s*\.\s*([A-Z]{2})\s*\.\s*([A-Z]{2})\s*\.\s*(\d{4,6})/);
    return m ? `${m[1]}.${m[2]}.${m[3]}.${m[4].padStart(6, '0')}` : undefined;
}
