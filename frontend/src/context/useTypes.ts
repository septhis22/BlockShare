import { create } from 'zustand';
import type { AppStore } from './types';

// Create the store hook using the AppStore type
export const useAppStore = create<AppStore>((set, get) => ({
  
  // --- INITIAL STATE ---
  username: 'Guest',
  metaIsConnected: false,
  count: 0,

  // --- ACTIONS ---

  /**
   * Updates the global username state.
   * @param name The new username string.
   */
  setUserName: (name: string) => 
    set({ username: name }),

  /**
   * Sets the connection status for MetaMask/Web3 provider.
   * @param is Boolean indicating if the wallet is connected.
   */
  setMetaIsConnected: (is: boolean) =>
    set({ metaIsConnected: is }),

  /**
   * Increments the count state by a specified amount.
   * @param by The value to increment the count by.
   */
  incrementCount: (by: number) => 
    // Use the functional form of 'set' when the new state depends on the old state
    set((state) => ({ 
        count: state.count + by 
    })),
}));

// Optional: Export selectors for cleaner component usage
export const selectUsername = (state: AppStore) => state.username;
export const selectMetaStatus = (state: AppStore) => state.metaIsConnected;
export const selectCount = (state: AppStore) => state.count;
export const selectActions = (state: AppStore) => ({
    setUserName: state.setUserName,
    setMetaIsConnected: state.setMetaIsConnected,
    incrementCount: state.incrementCount,
});