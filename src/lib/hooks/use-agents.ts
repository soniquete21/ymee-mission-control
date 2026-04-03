import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAgents() {
  const { data, error, isLoading, mutate } = useSWR("/api/agents", fetcher);
  return { agents: data || [], error, isLoading, mutate };
}
