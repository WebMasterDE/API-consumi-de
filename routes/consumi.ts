import { authorize, Role } from '../app';
import axios from 'axios';
import { tipo_dato } from '../models/tipo_dato';
import { letture_inverter } from '../models/letture_inverter';

import WebSocket from 'ws';

const wss = new WebSocket.Server({ port: 8446 });

let wsDisponibili: any[] = [];

let accessToken: string = 'c1a3bb69-4b89-43e2-86bb-53a608731f52';
let refreshToken: string = '79b985e3-2ad2-4ddf-b11b-3563bdde23a6';
let isFetching = false;


module.exports = function (app: any) {

    wss.on('connection', (ws) => {
        console.log('WS Client connected'.green);
        wsDisponibili.push(ws);
        ws.on('close', () => {
            console.log('WS Client disconnected'.red);
            wsDisponibili = wsDisponibili.filter(wsItem => wsItem !== ws);
        });
    });


    app.get('/api/v1/consumi', authorize([Role.Visualizzatore]), async (req: any, res: any) => {
        return res.status(200).json({ error: false, message: "Elenco consumi", data: [] });
    });

    async function getconsumi() {
        if (isFetching) {
            console.log("Chiamata già in corso, salto questa esecuzione.");
            return;
        }

        isFetching = true;

        try {
            console.log("Executing https request to fetch real-time data...".yellow);
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
                        'Authorization': `Bearer ${accessToken}`,
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
                let letture = response!.data.result_data.device_point_list[0];

                for (let key in letture) {
                    if (key.startsWith('p')) {
                        tipo_dato.findOne({ where: { codice: key } }).then(td => {
                            if (td) {
                                const now = new Date();
                                const oraItaliana = now.setHours(now.getHours() + 2);
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
        axios.post(
            "https://gateway.isolarcloud.eu/openapi/apiManage/refreshToken",
            {
                "refresh_token": refreshToken,
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
            accessToken = response.data.access_token;
            refreshToken = response.data.refresh_token;
            console.log("Access token refreshed:", accessToken);
        }).catch(error => {
            console.error("Error refreshing access token:", error);
        });
    }

}