import type { Api } from '../../types';
import { login, register } from '../auth/auth.services';
import client from './api';

export const api: Api = {
    login,
    register,
    forgotPassword: async (email) => {
        await client.post('/auth/forgot-password', { email });
    },
    resetPassword: async (token, password) => {
        await client.post('/auth/reset-password', { token, password });
    },
    getMe: async () => {
        const { data } = await client.get('/auth/me');
        return data;
    },
    updateProfile: async (patch) => {
        const { data } = await client.put('/auth/me', patch);
        return data;
    },
    listNorms: async (source) => {
        const { data } = await client.get(`/norms${source && source !== 'todas' ? `?source=${source}` : ''}`);
        return data;
    },
    getNorm: async (id) => {
        const { data } = await client.get(`/norms/${id}`);
        return data;
    },
    getPlant: async () => {
        const { data } = await client.get('/plants/me');
        return data;
    },
    updatePlant: async (patch) => {
        const { data } = await client.put('/plants/me', patch);
        return data;
    },
    listAlerts: async () => {
        const { data } = await client.get('/alerts');
        return data;
    },
    checkAlerts: async () => {
        const { data } = await client.post('/alerts/check');
        return data;
    },
    listNoticias: async (setor) => {
        const { data } = await client.get(`/noticias${setor ? `?setor=${encodeURIComponent(setor)}` : ''}`);
        return data;
    },
    getNormPdf: async (id) => {
        const { data } = await client.get(`/norms/${id}/pdf`, { responseType: 'blob' });
        return data;
    },
    listChatSessions: async () => {
        const { data } = await client.get('/chat');
        return data;
    },
    createChatSession: async () => {
        const { data } = await client.post('/chat');
        return data;
    },
    listChatMessages: async (sessionId) => {
        const { data } = await client.get(`/chat/${sessionId}/messages`);
        return data;
    },
    sendChatMessage: async (sessionId, question) => {
        const { data } = await client.post(`/chat/${sessionId}/message`, { question });
        return data;
    },
};
