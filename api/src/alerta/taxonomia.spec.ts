import { readFileSync } from 'fs';
import { join } from 'path';
import { TAXONOMIA } from './taxonomia';

// Lê a TAXONOMIA do classificador (ai/models/classifier.py): áreas com 4 espaços de recuo,
// subáreas com 8, cada uma como chave entre aspas.
function taxonomiaDoClassificador(): Record<string, string[]> {
    const python = readFileSync(join(__dirname, '../../../ai/models/classifier.py'), 'utf8');
    const bloco = python.slice(python.indexOf('TAXONOMIA = {'), python.indexOf('# 2. Prompt'));
    const taxonomia: Record<string, string[]> = {};
    let area = '';
    for (const linha of bloco.split('\n')) {
        const novaArea = linha.match(/^ {4}"([^"]+)": \{/);
        const sub = linha.match(/^ {8}"([^"]+)":/);
        if (novaArea) taxonomia[(area = novaArea[1])] = [];
        else if (sub && area) taxonomia[area].push(sub[1]);
    }
    return taxonomia;
}

describe('TAXONOMIA', () => {
    it('é a mesma do classificador em Python', () => {
        expect(TAXONOMIA).toEqual(taxonomiaDoClassificador());
    });
});
