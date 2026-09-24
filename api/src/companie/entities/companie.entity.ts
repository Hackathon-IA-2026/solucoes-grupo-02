import { BaseEntity } from '../../base.entity';
import { Column, Entity } from 'typeorm';

// Cada empresa cadastrada tem seus usuários, sua configuração de usina e seus
// alertas. Normas, trechos e limites são globais (a regulação vale pra todos).
@Entity({ name: 'empresas' })
export class CompanieEntity extends BaseEntity {
    @Column({ name: 'razao_social' })
    razaoSocial!: string;

    // Só dígitos. Nulo apenas na empresa criada pela migração dos dados antigos
    // (quando o COMPANY_CNPJ do .env não é válido).
    @Column({ type: 'varchar', length: 14, unique: true, nullable: true })
    cnpj!: string | null;
}
