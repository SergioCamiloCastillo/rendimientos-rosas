import { create } from 'zustand';
import { Block, CreateBlockInput } from '../domain/entities';
import { BlockRepository } from '../data/repositories';

interface BlockState {
  blocks: Block[];
  inactiveBlocks: Block[];
  isLoading: boolean;
  error: string | null;

  fetchBlocks: () => Promise<void>;
  fetchInactiveBlocks: () => Promise<void>;
  addBlock: (input: CreateBlockInput) => Promise<Block>;
  updateBlock: (id: string, input: Partial<CreateBlockInput>) => Promise<void>;
  deactivateBlock: (id: string) => Promise<void>;
  restoreBlock: (id: string) => Promise<void>;
  permanentDeleteBlock: (id: string) => Promise<void>;
  getActiveBlockNames: () => Promise<string[]>;
}

export const useBlockStore = create<BlockState>((set, get) => ({
  blocks: [],
  inactiveBlocks: [],
  isLoading: false,
  error: null,

  fetchBlocks: async () => {
    set({ isLoading: true, error: null });
    try {
      const blocks = await BlockRepository.getActive();
      set({ blocks, isLoading: false });
    } catch (error) {
      set({ error: 'Error al cargar bloques', isLoading: false });
    }
  },

  fetchInactiveBlocks: async () => {
    try {
      const inactiveBlocks = await BlockRepository.getInactive();
      set({ inactiveBlocks });
    } catch (error) {
      set({ error: 'Error al cargar bloques inactivos' });
    }
  },

  addBlock: async (input: CreateBlockInput) => {
    set({ isLoading: true, error: null });
    try {
      const block = await BlockRepository.create(input);
      set(state => ({
        blocks: [...state.blocks, block],
        isLoading: false,
      }));
      return block;
    } catch (error) {
      set({ error: 'Error al crear bloque', isLoading: false });
      throw error;
    }
  },

  updateBlock: async (id: string, input: Partial<CreateBlockInput>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await BlockRepository.update(id, input);
      if (updated) {
        set(state => ({
          blocks: state.blocks.map(b => b.id === id ? updated : b),
          isLoading: false,
        }));
      }
    } catch (error) {
      set({ error: 'Error al actualizar bloque', isLoading: false });
      throw error;
    }
  },

  deactivateBlock: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await BlockRepository.softDelete(id);
      set(state => ({
        blocks: state.blocks.filter(b => b.id !== id),
        isLoading: false,
      }));
      await get().fetchInactiveBlocks();
    } catch (error) {
      set({ error: 'Error al desactivar bloque', isLoading: false });
      throw error;
    }
  },

  restoreBlock: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await BlockRepository.restore(id);
      await get().fetchBlocks();
      await get().fetchInactiveBlocks();
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Error al restaurar bloque', isLoading: false });
      throw error;
    }
  },

  permanentDeleteBlock: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await BlockRepository.permanentDelete(id);
      set(state => ({
        inactiveBlocks: state.inactiveBlocks.filter(b => b.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Error al eliminar bloque', isLoading: false });
      throw error;
    }
  },

  getActiveBlockNames: async () => {
    return BlockRepository.getActiveNames();
  },
}));
