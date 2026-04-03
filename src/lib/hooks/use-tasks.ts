import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTasks() {
  const { data, error, isLoading, mutate } = useSWR("/api/tasks", fetcher);
  return { tasks: data || [], error, isLoading, mutate };
}
