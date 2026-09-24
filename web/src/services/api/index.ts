import { api as mock } from './mock';
import { api as http } from './http';

const usarMock = import.meta.env.VITE_USE_MOCK !== 'false';

export const api = usarMock ? mock : http;
export const MODO_MOCK = usarMock;
