// O que fica em `req.user` nas rotas autenticadas. O token só carrega o `id`;
// empresa e permissão vêm do banco a cada requisição (JwtStrategy).
export type UserPayload = {
    id: string;
    companyId: string;
    isAdmin: boolean;
};
