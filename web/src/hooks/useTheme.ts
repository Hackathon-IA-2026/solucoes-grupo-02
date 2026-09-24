import { useContext } from 'react';
import { ThemeCtx } from '../context/ThemeContext';

export const useTheme = () => useContext(ThemeCtx);
