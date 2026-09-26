import type { NormaEntity } from '../norma/entities/norma.entity';
import type { PlantEntity } from '../plant/entities/plant.entity';
import type { CompanieEntity } from '../companie/entities/companie.entity';
import { raizCnpj } from '../utils/cnpj';
import { normalizar } from '../utils/texto';

// Quais áreas/subáreas da norma a usina monitora. A norma guarda o que o classificador
// devolveu: `area` = "Solar, Eólica" e `subarea` = "Solar > Geração distribuída; Eólica > ...".
// Sem área marcada no perfil, nada casa. Sem subárea marcada, casa só pela área.
export function assuntosMonitorados(norma: Pick<NormaEntity, 'area' | 'subarea'>, plant: Pick<PlantEntity, 'areas' | 'subareas'>): string[] {
    const areasUsina = new Set((plant.areas ?? []).map(normalizar));
    const subareasUsina = new Set((plant.subareas ?? []).map(normalizar));
    if (areasUsina.size === 0) return [];

    const pares = (norma.subarea ?? '')
        .split(';')
        .map((par) => par.split('>').map((s) => s.trim()))
        .filter((par): par is [string, string] => par.length === 2 && Boolean(par[0]) && Boolean(par[1]));

    const assuntos =
        pares.length > 0
            ? pares
                  .filter(([area, sub]) => areasUsina.has(normalizar(area)) && (subareasUsina.size === 0 || subareasUsina.has(normalizar(sub))))
                  .map(([area, sub]) => `${area} › ${sub}`)
            : (norma.area ?? '')
                  .split(',')
                  .map((a) => a.trim())
                  .filter((a) => a && areasUsina.has(normalizar(a)));

    return [...new Set(assuntos)];
}

// O que identifica a empresa nos atos individuais: o CNPJ dela e os CNPJs/CEGs da configuração da usina.
type PlantComEmpresa = Pick<PlantEntity, 'cnpjs' | 'cegs'> & { company?: Pick<CompanieEntity, 'cnpj'> | null };
export type PerfilDaEmpresa = PlantComEmpresa & Pick<PlantEntity, 'areas' | 'subareas'>;

// A norma cita a empresa: pelo CNPJ (da empresa ou de uma SPE dela, comparando a raiz —
// matriz e filiais são a mesma pessoa jurídica) ou pelo CEG de uma usina dela.
export function citaAEmpresa(norma: Pick<NormaEntity, 'cnpjs' | 'cegs'>, plant: PlantComEmpresa): boolean {
    const raizes = new Set([plant.company?.cnpj, ...(plant.cnpjs ?? [])].filter((c): c is string => Boolean(c)).map(raizCnpj));
    const cegs = new Set(plant.cegs ?? []);
    return (norma.cnpjs ?? []).some((c) => raizes.has(raizCnpj(c))) || (norma.cegs ?? []).some((c) => cegs.has(c));
}

// Se a norma entra no feed da empresa. Ato individual (despacho que libera uma usina, multa,
// REIDI...) só para a empresa citada; ato geral pelas áreas monitoradas — `porArea: false`
// (o "todas" do feed) ou perfil sem área marcada mostram todos os atos gerais.
export function normaInteressa(
    norma: Pick<NormaEntity, 'area' | 'subarea' | 'abrangencia' | 'cnpjs' | 'cegs'>,
    plant: PerfilDaEmpresa,
    porArea = true,
): boolean {
    if (citaAEmpresa(norma, plant)) return true;
    if (norma.abrangencia === 'individual') return false;
    if (!porArea || !plant.areas?.length) return true;
    return assuntosMonitorados(norma, plant).length > 0;
}
