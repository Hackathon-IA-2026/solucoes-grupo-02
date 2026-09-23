import type { Api } from '../types';
import { login, register } from '../services/auth/auth.services';
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
    ask: async (question) => {
        const { data } = await client.post('/copilot/ask', { question });
        return data;
    },
};
