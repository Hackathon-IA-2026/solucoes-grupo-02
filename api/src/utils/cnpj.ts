import { registerDecorator, ValidationOptions } from 'class-validator';

export function somenteDigitos(valor: string): string {
    return valor.replace(/\D/g, '');
}

// Confere os dois dígitos verificadores do CNPJ (aceita com ou sem máscara).
export function cnpjValido(valor: string): boolean {
    const cnpj = somenteDigitos(valor);
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

    const digito = (base: string) => {
        const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const soma = pesos.reduce((acc, peso, i) => acc + Number(base[i]) * peso, 0);
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    const d1 = digito(cnpj.slice(0, 12));
    const d2 = digito(cnpj.slice(0, 12) + d1);
    return cnpj.endsWith(`${d1}${d2}`);
}

// Os 8 primeiros dígitos: matriz e filiais têm a mesma raiz (são a mesma pessoa jurídica).
export function raizCnpj(cnpj: string): string {
    return somenteDigitos(cnpj).slice(0, 8);
}

export function formatarCnpj(cnpj?: string | null): string {
    if (!cnpj) return '';
    const d = somenteDigitos(cnpj);
    if (d.length !== 14) return cnpj;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function IsCnpj(options?: ValidationOptions) {
    return (object: object, propertyName: string) =>
        registerDecorator({
            name: 'isCnpj',
            target: object.constructor,
            propertyName,
            options: { message: 'CNPJ inválido.', ...options },
            validator: { validate: (valor: unknown) => typeof valor === 'string' && cnpjValido(valor) },
        });
}
