import api from '../../api/api';
import type { RegisterInput, Session } from '../../types';

interface AuthResponse {
    token?: string;
    access_token?: string;
    user: Session['user'];
}

function toSession({ token, access_token, user }: AuthResponse): Session {
    const sessionToken = token ?? access_token;
    if (!sessionToken) {
        throw new Error('A API não retornou um token de autenticação.');
    }

    return { token: sessionToken, user };
}

export async function login(email: string, password: string): Promise<Session> {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    return toSession(data);
}

export async function register(user: RegisterInput): Promise<Session> {
    const { data } = await api.post<AuthResponse>('/user', user);
    return toSession(data);
}
