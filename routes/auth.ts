import passport from 'passport';
import { authorize, authorizeRefresh, db, Role, TokenType } from '../app';
import * as jsonwebtoken from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { not_valid_tokens } from '../db/schema';

// JWT_SECRET è verificato all'avvio in app.ts
function generaToken(id: number, role: String) {
    const JWT_SECRET: string = process.env.JWT_SECRET!;
    return {
        id: id,
        role: role,
        token: jsonwebtoken.sign({ id, role, type: TokenType.Access }, JWT_SECRET, {expiresIn: '4h', jwtid: randomUUID()}),
        refreshToken: jsonwebtoken.sign({ id, role, type: TokenType.Refresh }, JWT_SECRET, {expiresIn: '7d', jwtid: randomUUID()})
    };
}

module.exports = function (app: any) {

    app.get('/api/v1/login', passport.authenticate('basic', {session: false}), async (req: any, res: any) => {
        let role: String = "Visualizzatore";

        console.log("Login granted. Generating token".green);

        return res.status(200).json({error: false, message: "", data: generaToken(req.user.id, role)});
    });

    
    app.post('/api/v1/logout', authorize([Role.Visualizzatore]), async (req: any, res: any) => {

        await db.insert(not_valid_tokens).values({id_utente: req.auth.id, token: req.headers.authorization, data_scadenza: new Date(req.auth.exp*1000)}).returning().then(([invalid_token]) => {
            return res.status(200).json({error: false, message: "Logout effettuato correttamente", data: invalid_token});
        }).catch((err: any) => {
            return res.status(401).json({error: true, message: "Errore durante il logout", data: []});
        });
    });


    // Il client chiama /refresh con il refresh token come Bearer: si emette una nuova coppia di token
    // e il refresh token usato viene invalidato, così non può essere riutilizzato
    app.get('/api/v1/refresh', authorizeRefresh(), async (req: any, res: any) => {
        await db.insert(not_valid_tokens).values({id_utente: req.auth.id, token: req.headers.authorization, data_scadenza: new Date(req.auth.exp*1000)});

        return res.status(200).json({error: false, message: "", data: generaToken(req.auth.id, req.auth.role)});
    });

    app.get('/api/v1/checkToken', authorize([Role.Visualizzatore]), async (req: any, res: any) => {
        return res.status(200).json({error: false, message: "", data: req.auth});
    });



}