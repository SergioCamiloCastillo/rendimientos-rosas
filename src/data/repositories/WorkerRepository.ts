import { Worker, CreateWorkerInput, WorkerSchema } from '../../domain/entities';
import { AsyncStorageAdapter, STORAGE_KEYS } from '../../infrastructure/storage/AsyncStorageAdapter';
import uuid from 'react-native-uuid';

export class WorkerRepository {
  static async getAll(): Promise<Worker[]> {
    const workers = await AsyncStorageAdapter.getItem<Worker[]>(STORAGE_KEYS.WORKERS);
    return workers || [];
  }

  static async getActive(): Promise<Worker[]> {
    const workers = await this.getAll();
    return workers.filter(w => w.isActive && !w.isDeleted);
  }

  static async getById(id: string): Promise<Worker | null> {
    const workers = await this.getAll();
    return workers.find(w => w.id === id) || null;
  }

  static async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const workers = await this.getAll();
    const normalizedName = name.trim().toLowerCase();
    return workers.some(w => 
      w.name.toLowerCase() === normalizedName && 
      w.id !== excludeId && 
      !w.isDeleted
    );
  }

  static async existsByCode(code: string, excludeId?: string): Promise<boolean> {
    if (!code) return false;
    const workers = await this.getAll();
    const normalizedCode = code.trim().toUpperCase();
    return workers.some(w => 
      w.code && w.code.toUpperCase() === normalizedCode && 
      w.id !== excludeId && 
      !w.isDeleted
    );
  }

  static async create(input: CreateWorkerInput): Promise<Worker> {
    const workers = await this.getAll();
    const now = new Date().toISOString();
    
    const nameExists = await this.existsByName(input.name);
    if (nameExists) {
      throw new Error('Ya existe un trabajador con este nombre');
    }

    // Solo validar código si no está vacío
    if (input.code && input.code.trim()) {
      const codeExists = await this.existsByCode(input.code);
      if (codeExists) {
        throw new Error('Ya existe un trabajador con este código');
      }
    }
    
    const newWorker: Worker = {
      ...input,
      id: uuid.v4() as string,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const validated = WorkerSchema.parse(newWorker);
    workers.push(validated);
    await AsyncStorageAdapter.setItem(STORAGE_KEYS.WORKERS, workers);
    
    return validated;
  }

  static async update(id: string, input: Partial<CreateWorkerInput>): Promise<Worker | null> {
    const workers = await this.getAll();
    const index = workers.findIndex(w => w.id === id);
    
    if (index === -1) return null;

    if (input.name) {
      const nameExists = await this.existsByName(input.name, id);
      if (nameExists) {
        throw new Error('Ya existe un trabajador con este nombre');
      }
    }

    if (input.code && input.code.trim()) {
      const codeExists = await this.existsByCode(input.code, id);
      if (codeExists) {
        throw new Error('Ya existe un trabajador con este código');
      }
    }

    const updated: Worker = {
      ...workers[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };

    const validated = WorkerSchema.parse(updated);
    workers[index] = validated;
    await AsyncStorageAdapter.setItem(STORAGE_KEYS.WORKERS, workers);
    
    return validated;
  }

  static async softDelete(id: string): Promise<boolean> {
    const workers = await this.getAll();
    const index = workers.findIndex(w => w.id === id);
    
    if (index === -1) return false;

    workers[index] = {
      ...workers[index],
      isActive: false,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorageAdapter.setItem(STORAGE_KEYS.WORKERS, workers);
    return true;
  }

  static async permanentDelete(id: string): Promise<boolean> {
    const workers = await this.getAll();
    const index = workers.findIndex(w => w.id === id);
    
    if (index === -1) return false;

    workers[index] = {
      ...workers[index],
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorageAdapter.setItem(STORAGE_KEYS.WORKERS, workers);
    return true;
  }

  static async restore(id: string): Promise<boolean> {
    const workers = await this.getAll();
    const index = workers.findIndex(w => w.id === id);
    
    if (index === -1) return false;

    workers[index] = {
      ...workers[index],
      isActive: true,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorageAdapter.setItem(STORAGE_KEYS.WORKERS, workers);
    return true;
  }

  static async getInactive(): Promise<Worker[]> {
    const workers = await this.getAll();
    return workers.filter(w => !w.isActive && !w.isDeleted);
  }
}
