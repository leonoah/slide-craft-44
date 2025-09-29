import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Placeholder, PPTXData } from '@/lib/pptx-parser';

interface PlaceholderUpdate {
  id: string;
  value: string;
  type: 'text' | 'image';
}

interface PPTXStore {
  currentFile: PPTXData | null;
  updates: Record<string, PlaceholderUpdate>;
  setCurrentFile: (file: PPTXData) => void;
  updatePlaceholder: (id: string, value: string, type: 'text' | 'image') => void;
  getPlaceholderValue: (id: string) => string | undefined;
  getPlaceholderStatus: (id: string) => 'empty' | 'filled';
  clearData: () => void;
}

export const usePPTXStore = create<PPTXStore>()(
  persist(
    (set, get) => ({
      currentFile: null,
      updates: {},

      setCurrentFile: (file) => set({ currentFile: file, updates: {} }),

      updatePlaceholder: (id, value, type) => {
        set((state) => ({
          updates: {
            ...state.updates,
            [id]: { id, value, type }
          }
        }));
      },

      getPlaceholderValue: (id) => {
        return get().updates[id]?.value;
      },

      getPlaceholderStatus: (id) => {
        const update = get().updates[id];
        return update && update.value ? 'filled' : 'empty';
      },

      clearData: () => set({ currentFile: null, updates: {} })
    }),
    {
      name: 'pptx-store',
      partialize: (state) => ({ 
        currentFile: state.currentFile,
        updates: state.updates 
      })
    }
  )
);