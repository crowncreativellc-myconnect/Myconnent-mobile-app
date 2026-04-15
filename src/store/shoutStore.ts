import { create } from 'zustand';
import type { ShoutOut, ShoutParseResult } from '../types';

interface ShoutState {
  activeShouts: ShoutOut[];
  draftParse: ShoutParseResult | null;
  isCreating: boolean;
  isParsing: boolean;
}

interface ShoutActions {
  setActiveShouts: (shouts: ShoutOut[]) => void;
  prependShout: (shout: ShoutOut) => void;
  updateShout: (id: string, patch: Partial<ShoutOut>) => void;
  setDraftParse: (result: ShoutParseResult | null) => void;
  setCreating: (creating: boolean) => void;
  setParsing: (parsing: boolean) => void;
  clearDraft: () => void;
}

type ShoutStore = ShoutState & ShoutActions;

export const useShoutStore = create<ShoutStore>((set) => ({
  // State
  activeShouts: [],
  draftParse: null,
  isCreating: false,
  isParsing: false,

  // Actions
  setActiveShouts: (activeShouts) => set({ activeShouts }),
  prependShout: (shout) =>
    set((state) => ({ activeShouts: [shout, ...state.activeShouts] })),
  updateShout: (id, patch) =>
    set((state) => ({
      activeShouts: state.activeShouts.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    })),
  setDraftParse: (draftParse) => set({ draftParse }),
  setCreating: (isCreating) => set({ isCreating }),
  setParsing: (isParsing) => set({ isParsing }),
  clearDraft: () => set({ draftParse: null }),
}));
