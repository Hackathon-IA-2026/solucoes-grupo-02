import { BaseEntity } from '../../base.entity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'empresas' })
export class CompanieEntity extends BaseEntity {
    @Column({ name: 'razao_social' })
    razaoSocial!: string;

    @Column({ type: 'varchar', length: 14, unique: true, nullable: true })
    cnpj!: string | null;
}
