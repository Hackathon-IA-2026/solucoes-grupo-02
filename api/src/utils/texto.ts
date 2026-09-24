// Compara nomes de área/subárea e termos de busca ignorando maiúsculas e acentos
// ("Eólica" === "eolica"), do mesmo jeito que o `_chave()` do classificador em Python.
export function normalizar(texto: string): string {
    return texto
        .normalize('NFKD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();
}

// Tudo que vem das normas (DOU/ANEEL) é texto externo: escapa antes de montar HTML
// de e-mail ou da resposta do copiloto (que o front renderiza com innerHTML).
export function escapeHtml(texto: string): string {
    return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
