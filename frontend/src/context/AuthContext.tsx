import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import axios from 'axios';
import {
  clearWalletEncryptionIdentityCache,
  deriveWalletEncryptionIdentity,
  type WalletEncryptionIdentity
} from '../utils/walletEncryption';

interface User {
  id: string;
  name: string;
  email: string;
  public_key: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  walletAddress: string | null;
  encryptionIdentity: WalletEncryptionIdentity | null;
  setEncryptionIdentity: (identity: WalletEncryptionIdentity | null) => void;
  updatePublicKey: (publicKey: string) => void;
  connectWallet: () => Promise<string>;
  login: (email: string, password: string, walletAddress: string) => Promise<void>;
  register: (name: string, email: string, password: string, walletAddress: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [encryptionIdentity, setEncryptionIdentity] = useState<WalletEncryptionIdentity | null>(null);
  const walletAddressRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        const storedProfile = JSON.parse(storedUser) as Partial<User>;
        if (
          typeof storedProfile.id !== 'string'
          || typeof storedProfile.name !== 'string'
          || typeof storedProfile.email !== 'string'
        ) {
          throw new Error('Stored profile is invalid');
        }

        const safeProfile: User = {
          id: storedProfile.id,
          name: storedProfile.name,
          email: storedProfile.email,
          public_key: ''
        };
        setToken(storedToken);
        setUser(safeProfile);
        localStorage.setItem('user', JSON.stringify({
          id: safeProfile.id,
          name: safeProfile.name,
          email: safeProfile.email
        }));
        void axios.get('http://localhost:5000/api/auth/profile', {
          headers: { Authorization: `Bearer ${storedToken}` }
        }).then(response => {
          const serverUser = response.data?.data?.user as User | undefined;
          if (serverUser?.id === safeProfile.id && typeof serverUser.public_key === 'string') {
            setUser(currentUser => currentUser?.id === safeProfile.id
              ? { ...currentUser, public_key: serverUser.public_key }
              : currentUser);
          }
        }).catch(() => undefined);
      } catch {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      const nextAddress = accounts[0] ?? null;
      const previousAddress = walletAddressRef.current;
      walletAddressRef.current = nextAddress;

      if (previousAddress && previousAddress.toLowerCase() !== nextAddress?.toLowerCase()) {
        clearWalletEncryptionIdentityCache();
      }

      setWalletAddress(nextAddress);
      setEncryptionIdentity(current =>
        current && nextAddress?.toLowerCase() !== current.address.toLowerCase() ? null : current
      );
    };

    ethereum.on?.('accountsChanged', handleAccountsChanged);
    ethereum.request({ method: 'eth_accounts' })
      .then(handleAccountsChanged)
      .catch(() => setWalletAddress(null));

    return () => ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
  }, []);

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.data?.message === 'Token expired') {
          clearWalletEncryptionIdentityCache();
          setToken(null);
          setUser(null);
          setEncryptionIdentity(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptorId);
  }, []);

  const connectWallet = async (): Promise<string> => {
    if (!window.ethereum) throw new Error('MetaMask is required to continue.');
    const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const address = accounts[0];
    if (!address) throw new Error('No MetaMask account was selected.');
    walletAddressRef.current = address;
    setWalletAddress(address);
    return address;
  };

  const persistAuthenticatedSession = (
    userData: User,
    newToken: string,
    identity: WalletEncryptionIdentity
  ) => {
    const activeUser = { ...userData, public_key: identity.publicKey };
    setUser(activeUser);
    setToken(newToken);
    setEncryptionIdentity(identity);
    setWalletAddress(identity.address);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify({
      id: activeUser.id,
      name: activeUser.name,
      email: activeUser.email
    }));
  };

  const login = async (email: string, password: string, connectedAddress: string) => {
    if (!connectedAddress) throw new Error('Connect MetaMask before logging in.');
    const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
    const { user: userData, token: newToken } = response.data.data;
    const identity = await deriveWalletEncryptionIdentity(newToken, connectedAddress);
    persistAuthenticatedSession(userData, newToken, identity);
  };

  const register = async (name: string, email: string, password: string, connectedAddress: string) => {
    if (!connectedAddress) throw new Error('Connect MetaMask before registering.');

    let accountCreated = false;
    try {
      const response = await axios.post('http://localhost:5000/api/auth/signup', {
        name,
        email,
        password,
        wallet_address: connectedAddress
      });
      accountCreated = true;

      const { user: userData, token: newToken } = response.data.data;
      const identity = await deriveWalletEncryptionIdentity(newToken, connectedAddress);
      persistAuthenticatedSession(userData, newToken, identity);
    } catch (error) {
      if (accountCreated) {
        const detail = error instanceof Error ? error.message : 'MetaMask signing did not complete.';
        throw new Error(`Account created, but wallet key activation failed. Log in with the same wallet to finish setup. ${detail}`);
      }
      throw error;
    }
  };

  const updatePublicKey = (publicKey: string) => {
    if (!user) return;
    setUser({ ...user, public_key: publicKey });
    localStorage.setItem('user', JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email
    }));
  };

  const logout = () => {
    clearWalletEncryptionIdentityCache();
    setUser(null);
    setToken(null);
    setEncryptionIdentity(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value: AuthContextType = {
    user,
    token,
    walletAddress,
    encryptionIdentity,
    setEncryptionIdentity,
    updatePublicKey,
    connectWallet,
    login,
    register,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
