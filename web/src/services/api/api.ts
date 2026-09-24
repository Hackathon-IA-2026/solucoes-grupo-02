import axios from 'axios';

export const TOKEN_KEY = 'es-token';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
    withCredentials: true,
});

api.interceptors.request.use(
    function (config) {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    function (error) {
        // Do something with request error
        return Promise.reject(error);
    },
);

// api.interceptors.request.use((config) => {
//     try {
//         const token = localStorage.getItem(TOKEN_KEY);
//         if (token && !config.headers.Authorization) {
//             config.headers.Authorization = `Bearer ${token}`;
//         }
//     } catch {
//         //
//     }

//     return config;
// });

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.message;
        return Promise.reject(message ? new Error(message) : error);
    },
);

export default api;
