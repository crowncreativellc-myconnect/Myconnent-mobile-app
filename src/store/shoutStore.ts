import { create } from 'zustand';
import type { ShoutOut, ShoutParseResult } from '../types';

interface ShoutState {
  activeShouts: ShoutOut[];
  selectedShout: ShoutOut | null;
  draftParse: ShoutParseResult | null;
  isCreating: boolean;
  isParsing: boolean;
}

interface ShoutActions {
  setActiveShouts: (shouts: ShoutOut[]) => void;
  setSelectedShout: (shout: ShoutOut | null) => void;
  prependShout: (shout: ShoutOut) => void;
  updateShout: (id: string, patch: Partial<ShoutOut>) => void;
  removeShout: (id: string) => void;
  patchAuthorInShouts: (userId: string, patch: Partial<ShoutOut['author']>) => void;
  setDraftParse: (result: ShoutParseResult | null) => void;
  setCreating: (creating: boolean) => void;
  setParsing: (parsing: boolean) => void;
  clearDraft: () => void;
}

type ShoutStore = ShoutState & ShoutActions;

export const useShoutStore = create<ShoutStore>((set) => ({
  // State
  activeShouts: [],
  selectedShout: null,
  draftParse: null,
  isCreating: false,
  isParsing: false,

  // Actions
  setActiveShouts: (activeShouts) => set({ activeShouts }),
  setSelectedShout: (selectedShout) => set({ selectedShout }),
  prependShout: (shout) =>
    set((state) => ({ activeShouts: [shout, ...state.activeShouts] })),
  updateShout: (id, patch) =>
    set((state) => ({
      activeShouts: state.activeShouts.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    })),
  removeShout: (id) =>
    set((state) => ({
      activeShouts: state.activeShouts.filter((s) => s.id !== id),
    })),
  patchAuthorInShouts: (userId, patch) =>
    set((state) => ({
      activeShouts: state.activeShouts.map((s) =>
        s.author_id === userId && s.author
          ? { ...s, author: { ...s.author, ...patch } }
          : s,
      ),
    })),
  setDraftParse: (draftParse) => set({ draftParse }),
  setCreating: (isCreating) => set({ isCreating }),
  setParsing: (isParsing) => set({ isParsing }),
  clearDraft: () => set({ draftParse: null }),
}));
