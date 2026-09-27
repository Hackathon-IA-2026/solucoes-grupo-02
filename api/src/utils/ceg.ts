import { registerDecorator, ValidationOptions } from 'class-validator';

// CEG da ANEEL, ex.: "EOL.CV.RN.007663-4.01". O DOU escreve o final de vários jeitos,
// então a comparação usa só tipo.fonte.UF.núcleo: "EOL.CV.RN.007663".
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
