import { lerCsvAgentes } from './usinas-aneel.service';

const CSV = [
    '"DatGeracaoConjuntoDados";"NumCPFCNPJ";"NomAgente";"IdeNucleoCEG";"CodCEG";"NomEmpreendimento";"PctParticipacao";"DscRegimeExploracao";"SigTipoGeracao";"DscFaseUsina"',
    '"01-09-2026";"18565382000166";"ANGLOGOLD ASHANTI";"8";"PCH.PH.MG.000008-6.1";"E";"100,00";"Autoprodução de Energia";"PCH";"Operação"',
    '"01-09-2026";"1234567000195";"SPE COM ZERO À ESQUERDA";"2801";"EOL.CV.CE.002801-0.1";"Parque X";"50,50";"Produção Independente";"EOL";"Operação"',
    '"01-09-2026";"12345678901";"PESSOA FÍSICA";"9";"UFV.RS.MG.000009-4.1";"F";"100,00";"Registro";"UFV";"Operação"',
    '',
].join('\r\n');

describe('lerCsvAgentes', () => {
    it('lê o CSV da ANEEL, normaliza o CEG e ignora CPF', () => {
        expect(lerCsvAgentes(CSV)).toEqual([
            {
                ceg: 'PCH.PH.MG.000008',
                codigoCeg: 'PCH.PH.MG.000008-6.1',
                nome: 'E',
                tipo: 'PCH',
                fase: 'Operação',
                cnpj: '18565382000166',
                agente: 'ANGLOGOLD ASHANTI',
                participacaoPct: 100,
            },
            {
                ceg: 'EOL.CV.CE.002801',
                codigoCeg: 'EOL.CV.CE.002801-0.1',
                nome: 'Parque X',
                tipo: 'EOL',
                fase: 'Operação',
                cnpj: '01234567000195',
                agente: 'SPE COM ZERO À ESQUERDA',
                participacaoPct: 50.5,
            },
        ]);
    });
});
