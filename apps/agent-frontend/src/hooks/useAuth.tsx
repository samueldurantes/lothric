import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';

import { useGetCheckSession, usePostAuth } from '../schema/default/default';
import { GetCheckSession200User } from '../schema/model';
import { useTorus } from './useTorus';
import { useLocalStorage } from './useLocalStorage';

const AUTH_TOKEN_KEY = 'AGENT_SESSION_TOKEN';

type AuthContextType = {
  user: GetCheckSession200User | null;
  token: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  authenticateUser: (wallet: InjectedAccountWithMeta) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useLocalStorage(AUTH_TOKEN_KEY, '');
  const [user, setUser] = useState<GetCheckSession200User | null>(null);
  const { generateAuthReq } = useTorus();

  const {
    data: session,
    refetch,
    isLoading,
  } = useGetCheckSession({
    query: {
      queryKey: ['check-session', token],
      enabled: !!token,
      refetchInterval: 1000,
    },
    request: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { mutate: postAuth } = usePostAuth({
    mutation: {
      onSuccess: ({ data, status }) => {
        if (status === 200) {
          setToken(data.token);
        }
      },
    },
  });

  const authenticateUser = useCallback(
    async (wallet: InjectedAccountWithMeta) => {
      const { payload, address, signature } = await generateAuthReq(wallet);

      postAuth({ data: { payload, signature, address } });
    },
    [generateAuthReq, postAuth]
  );

  const logout = useCallback(() => {
    setToken('');
    setUser(null);
  }, []);

  useEffect(() => {
    if (token) {
      void refetch();
    } else {
      setUser(null);
    }
  }, [token, refetch]);

  useEffect(() => {
    if (session?.status === 200 && session.data?.user) {
      setUser(session.data.user);
    } else if (session?.status === 401) {
      setUser(null);
    }
  }, [session]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: !!user,
      isLoading,
      authenticateUser,
      logout,
    }),
    [user, token, isLoading, authenticateUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
