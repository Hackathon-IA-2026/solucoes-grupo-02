import type { NormaEntity } from '../norma/entities/norma.entity';
import type { PlantEntity } from '../plant/entities/plant.entity';
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
