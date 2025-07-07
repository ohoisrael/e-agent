import { createContext, useContext, ReactNode, useMemo, useState, useCallback } from "react";
import { getCurrentUser, getLatestProperties } from "./appwrite";
import useAppwrite from "./useAppwrite";

interface User {
  $id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
}

interface GlobalContextType {
  isLogged: boolean;
  user: User | null;
  loading: boolean;
  refetchUser: () => Promise<void>;
  refetchProperties: () => Promise<void>;
  triggerPropertyRefresh: () => void;
  refreshTrigger: number;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const {
    data: user,
    loading: loadingUser,
    refetch: refetchUser,
  } = useAppwrite<User, {}>({ fn: getCurrentUser, skip: false });

  const { refetch: refetchProperties } = useAppwrite({
    fn: getLatestProperties,
    skip: true,
  });

  const isLogged = !!user;
  const loading = loadingUser;

  const triggerPropertyRefresh = useCallback(() => {
    setRefreshTrigger((prev) => {
      console.log("GlobalProvider: triggerPropertyRefresh called, new refreshTrigger:", prev + 1);
      return prev + 1;
    });
  }, []);

  const value = useMemo(
    () => ({
      isLogged,
      user,
      loading,
      refetchUser,
      refetchProperties,
      triggerPropertyRefresh,
      refreshTrigger,
    }),
    [isLogged, user, loading, refetchUser, refetchProperties, triggerPropertyRefresh, refreshTrigger]
  );

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};

export const useGlobalContext = () => {
  const ctx = useContext(GlobalContext);
  if (!ctx) throw new Error("useGlobalContext must be used within GlobalProvider");
  return ctx;
};

export default GlobalProvider;