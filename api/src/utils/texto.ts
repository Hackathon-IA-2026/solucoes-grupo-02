// Compara nomes de área/subárea e termos de busca ignorando maiúsculas e acentos
// ("Eólica" === "eolica"), do mesmo jeito que o `_chave()` do classificador em Python.
export function normalizar(texto: string): string {
    return texto
        .normalize('NFKD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();
}

// Resposta do copiloto guardada como HTML -> texto, para mandar como histórico ao LLM.
export function htmlParaTexto(html: string): string {
    return html
        .replace(/<br\s*\/?>|<\/p>|<\/li>/gi, '\n')
        .replace(/<li>/gi, '- ')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/\n{2,}/g, '\n')
        .trim();
}

// Tudo que vem das normas (DOU/ANEEL) é texto externo: escapa antes de montar HTML
// de e-mail ou da resposta do copiloto (que o front renderiza com innerHTML).
export function escapeHtml(texto: string): string {
    return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
