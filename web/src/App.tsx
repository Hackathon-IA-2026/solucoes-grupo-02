import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAuth } from './hooks/useAuth';
import { AlertsPage } from './pages/AlertsPage';
import { CopilotPage } from './pages/CopilotPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { NoticiasPage } from './pages/NoticiasPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { SummariesPage } from './pages/SummariesPage';

function Protegida({ children }: { children: JSX.Element }) {
    const { user } = useAuth();
    return user ? children : <Navigate to="/entrar" replace />;
}

export function App() {
    return (
        <Routes>
            <Route path="/entrar" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
            <Route
                element={
                    <Protegida>
                        <AppShell />
                    </Protegida>
                }
            >
                <Route path="/painel" element={<DashboardPage />} />
                <Route path="/alertas" element={<AlertsPage />} />
                <Route path="/resumos" element={<SummariesPage />} />
                <Route path="/noticias" element={<NoticiasPage />} />
                <Route path="/copiloto" element={<CopilotPage />} />
                <Route path="/perfil" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/painel" replace />} />
        </Routes>
    );
}
