// CEG da ANEEL ("EOL.CV.RN.007663-4.01") no formato que a API guarda e compara:
// tipo.fonte.UF.núcleo, sem dígito e versão (mesma regra de api/src/utils/ceg.ts).
export function normalizarCeg(valor: string): string | undefined {
    const m = valor.toUpperCase().match(/\b([A-Z]{3})\s*\.\s*([A-Z]{2})\s*\.\s*([A-Z]{2})\s*\.\s*(\d{4,6})/);
    return m ? `${m[1]}.${m[2]}.${m[3]}.${m[4].padStart(6, '0')}` : undefined;
}
