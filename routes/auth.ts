import passport from 'passport';
import { authorize, db, Role} from '../app';
import * as jsonwebtoken from 'jsonwebtoken';
import bcrypt from "bcrypt";
import { not_valid_tokens } from '../db/schema';

module.exports = function (app: any) {

    app.get('/api/v1/login', passport.authenticate('basic', {session: false}), async (req: any, res: any) => {
        let role: String = "Visualizzatore";

        const tokendata = {
            id: req.user.id,
            role: role
        };

        console.log("Login granted. Generating token".green);

        // JWT_SECRET è verificato all'avvio in app.ts
        const JWT_SECRET: string = process.env.JWT_SECRET!;
        const token_signed: string = jsonwebtoken.sign(tokendata, JWT_SECRET, {expiresIn: '4h'});

        const refreshToken: string = jsonwebtoken.sign(tokendata, JWT_SECRET, {expiresIn: '7d'});

        const user = {
            id: req.user.id,
            role: role,
            token: token_signed,
            refreshToken: refreshToken
        }

        return res.status(200).json({error: false, message: "", data: user});
    });

    
    app.post('/api/v1/logout', authorize([Role.Visualizzatore]), async (req: any, res: any) => {

        await db.insert(not_valid_tokens).values({id_utente: req.auth.id, token: req.headers.authorization, data_scadenza: new Date(req.auth.exp*1000)}).returning().then(([invalid_token]) => {
            return res.status(200).json({error: false, message: "Logout effettuato correttamente", data: invalid_token});
        }).catch((err: any) => {
            return res.status(401).json({error: true, message: "Errore durante il logout", data: []});
        });
    });


    app.get('/api/v1/refresh',authorize([Role.Visualizzatore]),async (req: any, res: any) => {
        let token = req.headers.authorization.split(' ')[1]
        jsonwebtoken.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
            if (err) {
                return res.status(401).json({error: true, message: "Token non valido", data: []});
            }
            const tokendata = {
                id: user.id,
                role: user.role
            };

            const token_signed: string = jsonwebtoken.sign(tokendata, process.env.JWT_SECRET!, {expiresIn: '4h'});
            const refreshToken: string = jsonwebtoken.sign(tokendata, process.env.JWT_SECRET!, {expiresIn: '7d'});

            const user_refresh = {
                id: user.id,
                role: user.role,
                token: token_signed,
                refreshToken: refreshToken
            }

            return res.status(200).json({error: false, message: "", data: user_refresh});
        });
    });

    app.get('/api/v1/checkToken', authorize([Role.Visualizzatore]), async (req: any, res: any) => {
        return res.status(200).json({error: false, message: "", data: req.auth});
    });



}