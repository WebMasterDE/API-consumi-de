import { Sequelize } from 'sequelize';
import express from 'express';
import { listRoutes } from './utils';
import 'colors';
import { expressjwt as jwt } from "express-jwt";
import passportHTTP from 'passport-http';
import passport from 'passport';
import { utenti } from './models/utenti';
import bcrypt from 'bcrypt';
import { initModels } from "./models/init-models";
import path from 'path';
import helmet from "helmet";
import cors from "cors";
import * as http from "http";
import { env } from 'process';





// check JWT_SECRET
const dotenv = require('dotenv').config()

if (dotenv.error) {
    console.log("Unable to load \".env\" file. Please provide one to store the JWT secret key".red);
    process.exit(-1);
}
if (!process.env.JWT_SECRET) {
    console.log("\".env\" file loaded but JWT_SECRET=<secret> key-value pair was not found".red);
    process.exit(-1);
}
if (!process.env.DB_NAME && !process.env.USERNAME_DB && !process.env.PW_DB && !process.env.DB_HOST) {
    console.log("\".env\" file loaded but DB_NAME_PORTALE_CONDOMINIO=<db_name>, USERNAME_DB=<db_username>, PW_DB=<password>, DB_HOST=<db_host> key-value pair was not found".red);
    process.exit(-1);
}


export const sequelize_consumi_de = new Sequelize(
    process.env.DB_NAME ?? '',
    process.env.USERNAME_DB ?? '',
    process.env.PW_DB,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'production' ? false : console.log,
        pool: {
            max: 20,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        dialectOptions: {
            connectTimeout: 60000
        }
    }
);



export const models = initModels(sequelize_consumi_de);


const app = express();
const JWT_SECRET: string = process.env.JWT_SECRET


app.use(express.json());

app.use(helmet());
app.use(cors());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// enable body parser
app.use(express.urlencoded({ limit: '100mb', parameterLimit: 100000, extended: true }));


app.use(passport.initialize()); // Inizializza passport


passport.use(new passportHTTP.BasicStrategy(
    function (user, password, done) {
        console.log("New login attempt from ".yellow + user);

        utenti.findOne({
            where: { username: user }
        }).then(async (user) => {

            if (!user) {
                return done({ statusCode: 401, error: true, errormessage: "Credenziali errate" });
            }

            if (user.password) {
                bcrypt.compare(password, user.password, function (err: any, result: any) {
                    if (result) return done(null, user);
                    else return done({ statusCode: 401, error: true, errormessage: 'Email o password errate.' });
                });
            } else {
                return done({ statusCode: 401, error: true, errormessage: 'Email o password errate.' });
            }
        }).catch((err) => {

            if (err) {
                return done({ statusCode: 500, error: true, errormessage: err });
            }
        })
    }
));



export enum Role {
    Visualizzatore = 'Visualizzatore',
}

export function authorize(roles: Role[] = []) {
    return [
        // authenticate JWT token and attach user to request object (req.auth)
        jwt({ secret: JWT_SECRET, algorithms: ['HS256'] }),

        // authorize based on user role
        (req: any, res: any, next: any) => {
            console.log("Checking authorization of invalid-token".yellow);
            if (roles.length && roles.includes(req.auth.role)) {
                let find = false;
                roles.forEach((role: Role) => {
                    if (role === req.auth.role) find = true;
                })
                // authentication failed, missing role
                if (!find) return res.status(401).json({
                    error: true,
                    message: 'Non sei autorizzato ad accedere a questa risorsa.2'
                });
            }
            next();


        }
    ];
}

app.use((req, res, next) => {
    //decide to keep or not queries in console -> node_modules/sequelize/lib/sequelize.js line 552
    console.log("------------------------------------------------".inverse)
    console.log("New request for: " + req.url);
    console.log("Method: " + req.method);
    console.log("Time: " + new Date().toLocaleString());
    next();
});


app.get("/api/v1", (req, res) => {
    // next is not present beacuse this middleware is the last
    res.status(200).json(listRoutes(app));
});

require('./routes')(app);


app.use(async function (err: any, req: any, res: any, next: any) {
    console.log("------------------------------------------------".inverse.red);
    console.log("headers");
    console.log(req.headers);
    console.log("route.path");
    console.log(req.route?.path);
    if (typeof err === 'object') {
        console.log("Request error: ".red + JSON.stringify(err))
    }
    else {
        console.log("Request error: ".red + err);
    }

    if (err.code == "credentials_bad_scheme" || err.code == "credentials_bad_format" || err.code == "credentials_required" || err.code == "invalid_token" || err.code == "revoked_token" || err.code == "credentials_bad_credentials") {
        err.show = false;
        err.id_tipologia = 33;
    }

    let messagge = err.errormessage;
    if (err.inner != undefined && err.inner.message != undefined) {
        messagge = err.inner.message;
    }

    res.status(err.statusCode ? err.statusCode : err.status ? err.status : 500).json({
        error: true,
        message: messagge ? messagge : "Errore imprevisto"
    });
});

sequelize_consumi_de.authenticate()
    .then(() => {
        let server = http.createServer(app);
        const PORT = 3000;
        server.listen(PORT, () => {
            console.log(`Server is running on ${PORT}`.green);
        });

    })
    .catch(err => {
        console.error(process.env.DB_NAME);
        console.error('Unable to connect to the database:', err);
    });




// export default sequelize_app_installatori;
