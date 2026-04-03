import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useActivity(limit = 20) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/activity?limit=${limit}`,
    fetcher
  );
  return { events: data || [], error, isLoading, mutate };
}
