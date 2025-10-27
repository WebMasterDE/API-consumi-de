import { authorize, Role, sequelize_consumi_de, wsDisponibili } from '../app';
import axios from 'axios';
import { tipo_dato } from '../models/tipo_dato';
import { letture_inverter } from '../models/letture_inverter';
import WebSocket from 'ws';
import { token_sungrow } from '../models/token_sungrow';
import { QueryTypes } from 'sequelize';


let isFetching = false;


module.exports = function (app: any) {



    app.get('/api/v1/consumi', authorize([Role.Visualizzatore]), async (req: any, res: any) => {
        const results = await sequelize_consumi_de.query(`
                                                          SELECT DISTINCT ON (id_dato)
                                                          letture_inverter.id,
                                                          nome,
                                                          valore,
                                                          unita_misura,
                                                          data_lettura,
                                                          tipo_dato.id as tipo_dato,
                                                          tipo_dato.icona as icona
                                                          FROM letture_inverter
                                                          JOIN tipo_dato ON letture_inverter.id_dato = tipo_dato.id
                                                          ORDER BY id_dato, data_lettura DESC
                                                        `,
            {
                type: QueryTypes.SELECT
            });

        const dati_grafico = await sequelize_consumi_de.query(`SELECT letture_inverter.id, letture_inverter.valore as valore, letture_inverter.data_lettura as data_lettura, 'kWh' as unita_misura
                                                               FROM letture_inverter
                                                               JOIN tipo_dato ON letture_inverter.id_dato = tipo_dato.id
                                                               WHERE id_dato = 4
                                                               AND data_lettura::date = current_date
                                                               ORDER BY data_lettura ASC;`,
            {
                type: QueryTypes.SELECT
            });
        console.log(dati_grafico);
        return res.status(200).json({
            error: false, message: "", data: [
                { latestReadings: results },
                { graphData: dati_grafico }
            ]
        });
    });

    async function getconsumi() {
        if (isFetching) {
            console.log("Chiamata già in corso, salto questa esecuzione.");
            return;
        }

        isFetching = true;

        try {
            console.log("Executing https request to fetch real-time data...".yellow);
            let tokenRecord = await token_sungrow.findAll();
            if (!tokenRecord) {
                console.error("No token record found in database.");
                isFetching = false;
                return;
            }
            const response = await axios.post(
                'https://gateway.isolarcloud.eu/openapi/platform/getPowerStationRealTimeData',
                {
                    "appkey": process.env.APP_ID,
                    "is_get_point_dict": "1",
                    "point_id_list": ["83022", "83024", "83033", "83004", "83009", "83025", "83102", "83118", "83124", "83075"],
                    "ps_id_list": ["5873067"]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${tokenRecord[0].access_token}`,
                        'Content-Type': 'application/json',
                        'x-access-key': process.env.SECRET_KEY,
                    }
                }
            ).catch(error => {
                if (error.response && error.response.status === 401) {
                    console.warn("Access token expired, refreshing...");
                    refreshAccessToken();
                } else {
                    console.error("Error fetching real-time data:", error);
                }
            }).then(response => {
                if (!response) {
                    isFetching = false;
                    return;
                }
                let letture = response!.data.result_data.device_point_list[0];

                for (let key in letture) {
                    if (key.startsWith('p')) {
                        tipo_dato.findOne({ where: { codice: key } }).then(td => {
                            if (td) {
                                const now = new Date();
                                const oraItaliana = now.setHours(now.getHours() + 1);
                                console.log(`Saving data for ${key}: ${letture[key]} at ${new Date(oraItaliana).toISOString()}`);
                                letture_inverter.create({ id_dato: td.id, valore: letture[key], data_lettura: new Date(oraItaliana) });
                            }
                        });
                    }
                }
            }).finally(() => {
                wsDisponibili.forEach(ws => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send("update");
                    }
                });
                isFetching = false;
            });
        } catch (error) {
            console.error("Unexpected error:", error);
            isFetching = false;
        }

    }

    setInterval(getconsumi, 5 * 60 * 1000);

    getconsumi();





    async function refreshAccessToken() {
        let tokenRecord = await token_sungrow.findAll();
        console.log(tokenRecord);
        if (tokenRecord) {
            axios.post(
                "https://gateway.isolarcloud.eu/openapi/apiManage/refreshToken",
                {
                    "refresh_token": tokenRecord[0].refresh_token,
                    "appkey": process.env.APP_ID,
                    "secret_key": process.env.SECRET_KEY,
                    "sys_code": 207
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "x-access-key": process.env.SECRET_KEY,
                    },
                }
            ).then(response => {
                let accessToken = response.data.access_token;
                let refreshToken = response.data.refresh_token;
                console.log(response);
                token_sungrow.destroy({ where: {} }).then(() => {
                    token_sungrow.create({ access_token: accessToken, refresh_token: refreshToken });
                });
                console.log("Access token refreshed:", accessToken);
            }).catch(error => {
                console.error("Error refreshing access token:", error);
            });
        }
    }

}