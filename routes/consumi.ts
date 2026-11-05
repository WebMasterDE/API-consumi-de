import { authorize, db, Role, wsDisponibili } from '../app';
import axios from 'axios';
import WebSocket from 'ws';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { letture_inverter, tipo_dato, token_sungrow } from '../db/schema';


let isFetching = false;


module.exports = function (app: any) {



    app.get('/api/v1/consumi', authorize([Role.Visualizzatore]), async (req: any, res: any) => {
        const results = await db
            .selectDistinctOn([letture_inverter.id_dato], {
                id: letture_inverter.id,
                nome: tipo_dato.nome,
                valore: letture_inverter.valore,
                unita_misura: tipo_dato.unita_misura,
                data_lettura: letture_inverter.data_lettura,
                tipo_dato: tipo_dato.id,
                icona: tipo_dato.icona,
            })
            .from(letture_inverter)
            .innerJoin(tipo_dato, eq(letture_inverter.id_dato, tipo_dato.id))
            .orderBy(letture_inverter.id_dato, desc(letture_inverter.data_lettura));

        const dati_grafico = await db
            .select({
                id: letture_inverter.id,
                valore: letture_inverter.valore,
                data_lettura: letture_inverter.data_lettura,
                unita_misura: sql<string>`'kW'`,
                id_dato: letture_inverter.id_dato,
            })
            .from(letture_inverter)
            .where(and(
                inArray(letture_inverter.id_dato, [4, 9]),
                sql`(${letture_inverter.data_lettura} AT TIME ZONE 'Europe/Rome')::date = (now() AT TIME ZONE 'Europe/Rome')::date`
            ))
            .orderBy(asc(letture_inverter.data_lettura));
        return res.status(200).json({
            error: false, message: "", data: [
                { latestReadings: results },
                { graphData: dati_grafico }
            ]
        });
    });

    // tipo_dato con i contatori giornalieri (Wh, azzerati a mezzanotte) usati dal frontend per produzione e consumo
    const ID_PRODUZIONE = 2;
    const ID_CONSUMO = 7;

    // Storico per la TV: anno in corso a confronto con l'anno precedente.
    // Per ogni mese la somma dei totali giornalieri; il totale di un giorno è l'ultima lettura di quel giorno
    // (non il massimo: subito dopo mezzanotte Sungrow può restituire ancora il totale del giorno prima).
    // I totali dell'anno precedente sono calcolati anche sullo stesso periodo (1 gennaio -> stessa data di oggi)
    // per confrontarli in modo equo con l'anno in corso.
    app.get('/api/v1/storico', authorize([Role.Visualizzatore]), async (req: any, res: any) => {
        const anno = Number(new Intl.DateTimeFormat('it-IT', { year: 'numeric', timeZone: 'Europe/Rome' }).format(new Date()));

        const righe = (await db.execute(sql`
            WITH letture AS (
                SELECT id_dato, valore, data_lettura, (data_lettura AT TIME ZONE 'Europe/Rome')::date AS giorno
                FROM letture_inverter
                WHERE id_dato IN (${ID_PRODUZIONE}, ${ID_CONSUMO})
                  AND data_lettura >= make_timestamptz(${anno}::int - 1, 1, 1, 0, 0, 0, 'Europe/Rome')
            ),
            totali_giornalieri AS (
                SELECT DISTINCT ON (id_dato, giorno) id_dato, giorno, valore
                FROM letture
                ORDER BY id_dato, giorno, data_lettura DESC
            )
            SELECT extract(year FROM giorno)::int AS anno,
                   extract(month FROM giorno)::int AS mese,
                   id_dato,
                   sum(valore) AS valore,
                   sum(valore) FILTER (
                       WHERE giorno <= ((now() AT TIME ZONE 'Europe/Rome')::date - interval '1 year')::date
                   ) AS stesso_periodo
            FROM totali_giornalieri
            GROUP BY 1, 2, 3
        `)).rows as { anno: number, mese: number, id_dato: number, valore: number | null, stesso_periodo: number | null }[];

        const valore = (a: number, mese: number, idDato: number) =>
            righe.find(r => r.anno === a && r.mese === mese && r.id_dato === idDato)?.valore ?? null;
        const totale = (a: number, idDato: number, campo: 'valore' | 'stesso_periodo') =>
            righe.filter(r => r.anno === a && r.id_dato === idDato).reduce((tot, r) => tot + (r[campo] ?? 0), 0);

        const mesi = Array.from({ length: 12 }, (_, i) => ({
            mese: i + 1,
            produzione: valore(anno, i + 1, ID_PRODUZIONE),
            consumo: valore(anno, i + 1, ID_CONSUMO),
            produzionePrecedente: valore(anno - 1, i + 1, ID_PRODUZIONE),
            consumoPrecedente: valore(anno - 1, i + 1, ID_CONSUMO),
        }));

        return res.status(200).json({
            error: false, message: "", data: {
                anno,
                annoPrecedente: anno - 1,
                mesi,
                totali: {
                    produzione: totale(anno, ID_PRODUZIONE, 'valore'),
                    consumo: totale(anno, ID_CONSUMO, 'valore'),
                    // anno precedente, stesso periodo dell'anno in corso
                    produzionePrecedente: totale(anno - 1, ID_PRODUZIONE, 'stesso_periodo'),
                    consumoPrecedente: totale(anno - 1, ID_CONSUMO, 'stesso_periodo'),
                }
            }
        });
    });

    const SUNGROW_GATEWAY = 'https://gateway.isolarcloud.eu/openapi';
    const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI ?? 'https://consumi.divisionenergia.it/api/v1/oauth/callback';
    const PS_ID = "5873067";

    // result_code di /apiManage/token secondo la documentazione Sungrow
    const OAUTH_ERRORS: Record<string, string> = {
        "2": "codice di autorizzazione non valido (scaduto o già usato): ripeti l'autorizzazione",
        "3": "accesso non autorizzato",
        "4": "client non valido: controlla APP_ID e SECRET_KEY",
        "5": "redirect_uri non corrisponde a quello configurato nel Developer Portal",
        "6": "grant_type non supportato",
    };

    let refreshPromise: Promise<boolean> | null = null;

    // Le API token/refreshToken in pratica rispondono senza result_code (a differenza della documentazione):
    // la risposta è valida se result_code è "1" oppure, in sua assenza, se contiene i token
    function isTokenResponseOk(data: any): boolean {
        if (data?.result_code !== undefined) return data.result_code === "1";
        return !!data?.result_data?.access_token && !!data?.result_data?.refresh_token;
    }

    async function getTokenRecord() {
        const [record] = await db.select().from(token_sungrow).orderBy(asc(token_sungrow.id)).limit(1);
        return record;
    }

    // Salva i token aggiornando la riga esistente: non si cancella nulla finché non si hanno token validi
    async function saveTokens(result_data: any): Promise<boolean> {
        const accessToken = result_data?.access_token;
        const refreshToken = result_data?.refresh_token;
        if (!accessToken || !refreshToken) {
            console.error("Risposta Sungrow senza token, non aggiorno il DB:", result_data);
            return false;
        }
        const existing = await getTokenRecord();
        if (existing) {
            await db.update(token_sungrow)
                .set({ access_token: accessToken, refresh_token: refreshToken })
                .where(eq(token_sungrow.id, existing.id));
        } else {
            await db.insert(token_sungrow).values({ access_token: accessToken, refresh_token: refreshToken });
        }
        console.log(`Token Sungrow salvati (scadenza tra ${result_data.expires_in ?? '?'} s)`.green);
        return true;
    }

    // Callback OAuth2: Sungrow reindirizza qui dopo l'autorizzazione con ?code=...
    app.get('/api/v1/oauth/callback', async (req: any, res: any) => {
        const code = req.query.code;
        if (!code) {
            return res.status(400).send("Parametro 'code' mancante");
        }
        try {
            const response = await axios.post(
                `${SUNGROW_GATEWAY}/apiManage/token`,
                {
                    "appkey": process.env.APP_ID,
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": OAUTH_REDIRECT_URI
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "x-access-key": process.env.SECRET_KEY,
                    },
                }
            );
            const resultCode = response.data?.result_code;
            if (!isTokenResponseOk(response.data)) {
                console.error("Errore scambio code OAuth:", response.data);
                const motivo = OAUTH_ERRORS[resultCode] ?? response.data?.result_msg ?? 'risposta non valida';
                return res.status(502).send(`Errore Sungrow (${resultCode ?? '?'}): ${motivo}`);
            }
            // La callback è pubblica: si accettano solo token di un account autorizzato sul nostro impianto,
            // altrimenti chiunque potrebbe sostituire i token con quelli di un altro account
            const authPsList: string[] = (response.data.result_data?.auth_ps_list ?? []).map(String);
            if (!authPsList.includes(PS_ID)) {
                console.warn(`Autorizzazione rifiutata: l'impianto ${PS_ID} non è tra quelli autorizzati (${authPsList.join(', ') || 'nessuno'})`.yellow);
                return res.status(403).send(`L'impianto ${PS_ID} non è tra quelli autorizzati: ripeti l'autorizzazione selezionandolo.`);
            }
            if (!(await saveTokens(response.data.result_data))) {
                return res.status(502).send("Errore Sungrow: risposta senza token");
            }
            getconsumi();
            return res.status(200).send("Autorizzazione Sungrow completata. Puoi chiudere questa pagina.");
        } catch (error: any) {
            console.error("Errore scambio code OAuth:", error.response?.data ?? error);
            return res.status(500).send("Errore durante l'autorizzazione Sungrow");
        }
    });

    async function getconsumi() {
        if (isFetching) {
            console.log("Chiamata già in corso, salto questa esecuzione.");
            return;
        }

        isFetching = true;

        try {
            console.log("Executing https request to fetch real-time data...".yellow);
            const tokenRecord = await getTokenRecord();
            if (!tokenRecord) {
                console.error(`Nessun token Sungrow nel DB: autorizza l'app aprendo l'Authorization URL del Developer Portal (redirect su ${OAUTH_REDIRECT_URI}).`.red);
                return;
            }

            let response;
            try {
                response = await axios.post(
                    `${SUNGROW_GATEWAY}/platform/getPowerStationRealTimeData`,
                    {
                        "appkey": process.env.APP_ID,
                        "is_get_point_dict": "1",
                        "point_id_list": ["83022", "83024", "83033", "83004", "83009", "83025", "83102", "83118", "83124", "83075", "83106"],
                        "ps_id_list": [PS_ID]
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${tokenRecord.access_token}`,
                            'Content-Type': 'application/json',
                            'x-access-key': process.env.SECRET_KEY,
                        }
                    }
                );
            } catch (error: any) {
                if (error.response?.status === 401) {
                    console.warn("Access token expired, refreshing...");
                    await refreshAccessToken();
                } else {
                    console.error("Error fetching real-time data:", error.response?.data ?? error);
                }
                return;
            }

            // Sungrow può rispondere 200 con result_code di errore (es. token scaduto)
            if (response.data?.result_code !== "1") {
                console.error("Errore Sungrow:", response.data?.result_code, response.data?.result_msg);
                if (/token/i.test(response.data?.result_msg ?? '')) {
                    await refreshAccessToken();
                }
                return;
            }

            const letture = response.data.result_data?.device_point_list?.[0];
            if (!letture) {
                console.error("Nessuna lettura nella risposta Sungrow:", response.data.result_data);
                return;
            }

            const codici = Object.keys(letture).filter(key => key.startsWith('p'));
            const tipi = codici.length
                ? await db.select({ id: tipo_dato.id, codice: tipo_dato.codice }).from(tipo_dato).where(inArray(tipo_dato.codice, codici))
                : [];

            const dataLettura = new Date();
            const toNumber = (v: any) => (v === null || v === '' || isNaN(Number(v)) ? null : Number(v));
            const nuoveLetture = tipi.map(td => ({ id_dato: td.id, valore: toNumber(letture[td.codice]), data_lettura: dataLettura }));
            if (!nuoveLetture.length) {
                console.warn("Nessun codice della risposta Sungrow corrisponde a tipo_dato:", codici);
                return;
            }
            await db.insert(letture_inverter).values(nuoveLetture);
            console.log(`Salvate ${nuoveLetture.length} letture alle ${dataLettura.toISOString()}`);

            // notifica i client solo dopo che le letture sono state salvate
            wsDisponibili.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send("update");
                }
            });
        } catch (error) {
            console.error("Unexpected error:", error);
        } finally {
            isFetching = false;
        }

    }

    setInterval(getconsumi, 5 * 60 * 1000);

    getconsumi();





    // Un solo refresh alla volta: il refresh_token viene ruotato e una seconda chiamata lo invaliderebbe
    function refreshAccessToken(): Promise<boolean> {
        if (!refreshPromise) {
            refreshPromise = doRefreshAccessToken().finally(() => { refreshPromise = null; });
        }
        return refreshPromise;
    }

    async function doRefreshAccessToken(): Promise<boolean> {
        const tokenRecord = await getTokenRecord();
        if (!tokenRecord) {
            console.error("Nessun refresh token nel DB, serve una nuova autorizzazione OAuth.".red);
            return false;
        }
        try {
            const response = await axios.post(
                `${SUNGROW_GATEWAY}/apiManage/refreshToken`,
                {
                    "refresh_token": tokenRecord.refresh_token,
                    "appkey": process.env.APP_ID
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "x-access-key": process.env.SECRET_KEY,
                    },
                }
            );
            if (!isTokenResponseOk(response.data)) {
                console.error("Refresh token rifiutato da Sungrow, serve una nuova autorizzazione OAuth:".red, response.data);
                return false;
            }
            return await saveTokens(response.data.result_data);
        } catch (error: any) {
            console.error("Error refreshing access token:", error.response?.data ?? error);
            return false;
        }
    }

}