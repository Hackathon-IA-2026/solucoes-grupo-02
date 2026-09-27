import { readFileSync } from 'fs';
import { join } from 'path';
import { TAXONOMIA } from './taxonomia';

function taxonomiaDoClassificador(): Record<string, string[]> {
    const python = readFileSync(join(__dirname, '../../../ai/models/classifier.py'), 'utf8');
    const inicio = python.indexOf('TAXONOMIA = {');
    const bloco = python.slice(inicio, python.indexOf('\n}', inicio));
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
