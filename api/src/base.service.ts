import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, FindOptionsWhere, DeepPartial, FindManyOptions } from 'typeorm';
import { BaseEntity } from './base.entity';

@Injectable()
export abstract class BaseService<T extends BaseEntity> {
    constructor(protected readonly repository: Repository<T>) {}

    protected async persist(data: DeepPartial<T>): Promise<T> {
        const instance = this.repository.create(data);
        return await this.repository.save(instance);
    }

    protected async findAllInstances(options?: FindManyOptions<T>): Promise<T[]> {
        return await this.repository.find(options);
    }

    protected async findInstanceById(id: string): Promise<T | null> {
        return await this.repository.findOneBy({ id } as FindOptionsWhere<T>);
    }

    protected async findInstanceByIdOrFail(id: string): Promise<T> {
        const instance = await this.findInstanceById(id);
        if (!instance) {
            console.log(`Instância com ID ${id} não foi encontrada.`);
            throw new NotFoundException(`Instância com ID ${id} não foi encontrada.`);
        }
        return instance;
    }

    protected async updateInstance(id: string, data: DeepPartial<T>): Promise<T> {
        await this.findInstanceByIdOrFail(id);
        const mergedInstance = await this.repository.preload({
            id,
            ...data,
        } as unknown as DeepPartial<T>);

        return await this.repository.save(mergedInstance as T);
    }

    protected async deleteInstanceById(id: string): Promise<void> {
        const instance = await this.findInstanceByIdOrFail(id);
        await this.repository.remove(instance);
    }
}
