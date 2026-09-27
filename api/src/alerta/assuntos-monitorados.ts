import type { NormaEntity } from '../norma/entities/norma.entity';
import type { PlantEntity } from '../plant/entities/plant.entity';
import type { CompanieEntity } from '../companie/entities/companie.entity';
import { raizCnpj } from '../utils/cnpj';
import { normalizar } from '../utils/texto';
import { TAXONOMIA } from './taxonomia';

const SUBAREAS_DA_AREA = new Map(Object.entries(TAXONOMIA).map(([area, subs]) => [normalizar(area), new Set(subs.map(normalizar))]));

// Uma área vale inteira até que se marque alguma subárea dela.
export function assuntosMonitorados(norma: Pick<NormaEntity, 'area' | 'subarea'>, plant: Pick<PlantEntity, 'areas' | 'subareas'>): string[] {
    const areasUsina = new Set((plant.areas ?? []).map(normalizar));
    const subareasUsina = new Set((plant.subareas ?? []).map(normalizar));
    if (areasUsina.size === 0) return [];
    const recortada = (area: string) => [...(SUBAREAS_DA_AREA.get(normalizar(area)) ?? [])].some((s) => subareasUsina.has(s));

    const pares = (norma.subarea ?? '')
        .split(';')
        .map((par) => par.split('>').map((s) => s.trim()))
        .filter((par): par is [string, string] => par.length === 2 && Boolean(par[0]) && Boolean(par[1]));

    const assuntos =
        pares.length > 0
            ? pares
                  .filter(([area, sub]) => areasUsina.has(normalizar(area)) && (!recortada(area) || subareasUsina.has(normalizar(sub))))
                  .map(([area, sub]) => `${area} › ${sub}`)
            : (norma.area ?? '')
                  .split(',')
                  .map((a) => a.trim())
                  .filter((a) => a && areasUsina.has(normalizar(a)));

    return [...new Set(assuntos)];
}

type PlantComEmpresa = Pick<PlantEntity, 'cnpjs' | 'cegs'> & { company?: Pick<CompanieEntity, 'cnpj'> | null };
export type PerfilDaEmpresa = PlantComEmpresa & Pick<PlantEntity, 'areas' | 'subareas'>;

export function citaAEmpresa(norma: Pick<NormaEntity, 'cnpjs' | 'cegs'>, plant: PlantComEmpresa): boolean {
    const raizes = new Set([plant.company?.cnpj, ...(plant.cnpjs ?? [])].filter((c): c is string => Boolean(c)).map(raizCnpj));
    const cegs = new Set(plant.cegs ?? []);
    return (norma.cnpjs ?? []).some((c) => raizes.has(raizCnpj(c))) || (norma.cegs ?? []).some((c) => cegs.has(c));
}

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
