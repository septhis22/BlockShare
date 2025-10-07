// Define the properties that hold your state data
export interface State {
  username: string;
  metaIsConnected: boolean;
  count: number;
}

// Define the actions (functions) that modify the state
export interface Actions {
  setUserName: (name: string) => void;
  setMetaIsConnected : (is :boolean) => void;
  incrementCount: (by: number) => void;
}

// Combine both interfaces into a single Store type
export type AppStore = State & Actions;