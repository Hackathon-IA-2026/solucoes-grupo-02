// Máscara 00.000.000/0000-00 enquanto a pessoa digita.
export function mascararCnpj(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

// Mesma conferência dos dígitos verificadores que a API faz (api/src/utils/cnpj.ts).
export function cnpjValido(valor: string): boolean {
  const cnpj = valor.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digito = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const resto = pesos.reduce((acc, peso, i) => acc + Number(base[i]) * peso, 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(cnpj.slice(0, 12));
  return cnpj.endsWith(`${d1}${digito(cnpj.slice(0, 12) + d1)}`);
}
