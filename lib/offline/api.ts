/** fetch para as rotas /api do próprio app; redireciona ao login se a sessão expirou. */
export async function api(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, { credentials: 'same-origin', cache: 'no-store', ...init });
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  return res;
}

export async function readJson<T>(res: Response, errorMessage: string): Promise<T> {
  if (!res.ok) throw new Error(errorMessage);
  return (await res.json()) as T;
}
