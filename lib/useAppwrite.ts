import { Alert } from "react-native";
import { useEffect, useState, useCallback } from "react";

interface UseAppwriteOptions<T, P extends Record<string, any>> {
  fn: (params?: P) => Promise<T>;
  params?: P;
  skip?: boolean;
  refreshTrigger?: number;
}

interface UseAppwriteReturn<T, P> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: (newParams?: P) => Promise<void>;
}

export const useAppwrite = <T, P extends Record<string, any>>({
  fn,
  params,
  skip = false,
  refreshTrigger,
}: UseAppwriteOptions<T, P>): UseAppwriteReturn<T, P> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (fetchParams?: P) => {
    setLoading(true);
    setError(null);
    try {
    
      const result = await fn(fetchParams ?? ({} as P));
      setData(result);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }, [fn]);

  useEffect(() => {
    
    if (!skip) {
      fetchData(params);
    }
  }, [skip, params, fetchData, refreshTrigger]);

  return { data, loading, error, refetch: fetchData };
};

export default useAppwrite;