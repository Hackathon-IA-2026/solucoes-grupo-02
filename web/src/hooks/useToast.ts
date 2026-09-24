import { useContext } from 'react';
import { ToastCtx } from '../context/ToastContext';

export const useToast = () => useContext(ToastCtx);
