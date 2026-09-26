import { registerDecorator, ValidationOptions } from 'class-validator';

// CEG = Código Único de Empreendimentos de Geração da ANEEL, ex.: "EOL.CV.RN.007663-4.01"
// (tipo da usina . fonte . UF . núcleo - dígito . versão). O DOU escreve de vários jeitos
// ("...-4.01", "...-4.1", núcleo com 5 dígitos, cortado na tabela antes do dígito), então a
// comparação usa só tipo.fonte.UF.núcleo: "EOL.CV.RN.007663". O mesmo formato sai do
// `extrair_cegs` do pipeline (ai/functions/identificadores.py).
const CEG = /\b([A-Z]{3})\s*\.\s*([A-Z]{2})\s*\.\s*([A-Z]{2})\s*\.\s*(\d{4,6})/;

export function normalizarCeg(valor: string): string | undefined {
    const m = valor.toUpperCase().match(CEG);
    return m ? `${m[1]}.${m[2]}.${m[3]}.${m[4].padStart(6, '0')}` : undefined;
}

export function IsCeg(options?: ValidationOptions) {
    return (object: object, propertyName: string) =>
        registerDecorator({
            name: 'isCeg',
            target: object.constructor,
            propertyName,
            options: { message: 'CEG inválido (ex.: EOL.CV.RN.007663-4.01).', ...options },
            validator: { validate: (valor: unknown) => typeof valor === 'string' && normalizarCeg(valor) !== undefined },
        });
}
