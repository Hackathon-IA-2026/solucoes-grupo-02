import { normalizarCeg } from './ceg';

describe('normalizarCeg', () => {
    it('ignora dígito, versão e espaços, do jeito que o DOU escreve', () => {
        expect(normalizarCeg('UFV.RS.PE.075566-4.01')).toBe('UFV.RS.PE.075566');
        expect(normalizarCeg('EOL.CV.CE.002801-0.1')).toBe('EOL.CV.CE.002801');
        expect(normalizarCeg('UFV.RS.PI.056709 - 4.01')).toBe('UFV.RS.PI.056709');
        expect(normalizarCeg('ufv.rs.pe.075566-4.01')).toBe('UFV.RS.PE.075566');
    });

    it('completa o núcleo com zeros (o DOU às vezes corta um)', () => {
        expect(normalizarCeg('EOL.CV.RN.07663-4.01')).toBe('EOL.CV.RN.007663');
    });

    it('recusa o que não é CEG', () => {
        expect(normalizarCeg('48500.007392/2025-90')).toBeUndefined();
        expect(normalizarCeg('')).toBeUndefined();
    });
});
