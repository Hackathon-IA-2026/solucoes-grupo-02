// Áreas e subáreas que o classificador conhece: a mesma TAXONOMIA de ai/models/classifier.py
// (o taxonomia.spec.ts confere). A Central de Alertas oferece só estas (GET /plants/taxonomia):
// área ou subárea fora daqui nunca casaria com uma norma. Para monitorar uma área nova, inclua
// nos dois lugares — no Python com a descrição que o modelo usa para classificar.
export const TAXONOMIA: Record<string, string[]> = {
    Solar: ['Geração distribuída', 'Conexão e acesso'],
    Eólica: ['Cortes de geração', 'Outorga e autorização'],
    Armazenamento: ['Autorização de armazenamento', 'Conexão e faturamento de armazenamento'],
};
