import passport from 'passport';
import { authorize, Role} from '../app';
import * as jsonwebtoken from 'jsonwebtoken';
import { QueryTypes } from "sequelize";
import { not_valid_tokens } from '../models/not_valid_tokens';
import bcrypt from "bcrypt";
import { utenti } from '../models/utenti';

const DB_NAME_DBDIVEN: string = process.env.DB_NAME_DIVEN!;
const DB_NAME_PORTALE_CONDOMINIO: string = process.env.DB_NAME!;

module.exports = function (app: any) {

    app.get('/api/v1/login', passport.authenticate('basic', {session: false}), async (req: any, res: any) => {
        let role: String = "Visualizzatore";

        const tokendata = {
            id: req.user.id,
            mail: req.user.mail,
            role: role
        };

        console.log("Login granted. Generating token".green);
        const dotenv = require('dotenv').config()

        if (dotenv.error) {
            console.log("Unable to load \".env\" file. Please provide one to store the JWT secret key".red);
            process.exit(-1);
        }

        if (!process.env.JWT_SECRET) {
            console.log("Unable to load \".env\" file. Please provide one to store the JWT secret key".red);
            process.exit(-1);
        }

        const JWT_SECRET: string = process.env.JWT_SECRET;
        const token_signed: string = jsonwebtoken.sign(tokendata, JWT_SECRET, {expiresIn: '4h'});

        const refreshToken: string = jsonwebtoken.sign(tokendata, JWT_SECRET, {expiresIn: '7d'});

        const user = {
            id: req.user.id,
            mail: req.user.mail,
            role: role,
            token: token_signed,
            refreshToken: refreshToken
        }

        return res.status(200).json({error: false, message: "", data: user});
    });

    
    app.post('/api/v1/logout', authorize([Role.Visualizzatore]), async (req: any, res: any) => {

        await not_valid_tokens.create({id_utente: req.auth.id, token: req.headers.authorization, data_scadenza: new Date(req.auth.exp*1000)}).then((invalid_token) => {
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
                mail: user.mail,
                role: user.role
            };

            const token_signed: string = jsonwebtoken.sign(tokendata, process.env.JWT_SECRET!, {expiresIn: '4h'});
            const refreshToken: string = jsonwebtoken.sign(tokendata, process.env.JWT_SECRET!, {expiresIn: '7d'});

            const user_refresh = {
                id: user.id,
                mail: user.mail,
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