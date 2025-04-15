export const fetcher = async <T>(url: string, init?: RequestInit) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
    },
  });

  return {
    data: (await response.json()) as T,
    status: response.status,
    headers: response.headers,
  };
};

export default fetcher;
