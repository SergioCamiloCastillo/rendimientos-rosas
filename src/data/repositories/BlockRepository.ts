import { Block, CreateBlockInput, BlockSchema } from '../../domain/entities';
import { AsyncStorageAdapter, STORAGE_KEYS } from '../../infrastructure/storage/AsyncStorageAdapter';
import uuid from 'react-native-uuid';

export class BlockRepository {
  static async getAll(): Promise<Block[]> {
    const blocks = await AsyncStorageAdapter.getItem<Block[]>(STORAGE_KEYS.BLOCKS);
    return blocks || [];
  }

  static async getActive(): Promise<Block[]> {
    const blocks = await this.getAll();
    return blocks.filter(b => b.isActive && !b.isDeleted);
  }

  static async getActiveNames(): Promise<string[]> {
    const blocks = await this.getActive();
    return blocks.map(b => b.name);
  }

  static async getById(id: string): Promise<Block | null> {
    const blocks = await this.getAll();
    return blocks.find(b => b.id === id) || null;
  }

  static async create(input: CreateBlockInput): Promise<Block> {
    const blocks = await this.getAll();
    const now = new Date().toISOString();

    const newBlock: Block = {
      ...input,
      id: uuid.v4() as string,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const validated = BlockSchema.parse(newBlock);
    blocks.push(validated);
    await AsyncStorageAdapter.setItem(STORAGE_KEYS.BLOCKS, blocks);

    return validated;
  }

  static async update(id: string, input: Partial<CreateBlockInput>): Promise<Block | null> {
    const blocks = await this.getAll();
    const index = blocks.findIndex(b => b.id === id);

    if (index === -1) return null;

    const updated: Block = {
      ...blocks[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };

    const validated = BlockSchema.parse(updated);
    blocks[index] = validated;
    await AsyncStorageAdapter.setItem(STORAGE_KEYS.BLOCKS, blocks);

    return validated;
  }

  static async softDelete(id: string): Promise<boolean> {
    const blocks = await this.getAll();
    const index = blocks.findIndex(b => b.id === id);

    if (index === -1) return false;

    blocks[index] = {
      ...blocks[index],
      isActive: false,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorageAdapter.setItem(STORAGE_KEYS.BLOCKS, blocks);
    return true;
  }

  static async restore(id: string): Promise<boolean> {
    const blocks = await this.getAll();
    const index = blocks.findIndex(b => b.id === id);

    if (index === -1) return false;

    blocks[index] = {
      ...blocks[index],
      isActive: true,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorageAdapter.setItem(STORAGE_KEYS.BLOCKS, blocks);
    return true;
  }

  static async permanentDelete(id: string): Promise<boolean> {
    const blocks = await this.getAll();
    const index = blocks.findIndex(b => b.id === id);

    if (index === -1) return false;

    blocks[index] = {
      ...blocks[index],
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorageAdapter.setItem(STORAGE_KEYS.BLOCKS, blocks);
    return true;
  }

  static async getInactive(): Promise<Block[]> {
    const blocks = await this.getAll();
    return blocks.filter(b => !b.isActive && !b.isDeleted);
  }
}
