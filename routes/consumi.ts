import { authorize, Role } from '../app';
import axios from 'axios';

module.exports = function (app: any) {
    app.get('/api/v1/consumi', authorize([Role.Visualizzatore]), async (req: any, res: any) => {
        return res.status(200).json({ error: false, message: "Elenco consumi", data: [] });
    });

    app.get("/oauth/callback", async (req: any, res: any) => {
        const { code } = req.query;
        if (!code) return res.status(400).send("Missing authorization code");
        try {
            const response = await axios.post(
                "https://gateway.isolarcloud.eu/openapi/apiManage/token",
                {
                    appkey: process.env.APP_ID,
                    grant_type: "authorization_code",
                    code: code,
                    redirect_uri: process.env.REDIRECT_URI,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "x-access-key": process.env.SECRET_KEY!,
                    },
                }
            );
            return res.status(200).json(response.data);
        } catch (error) {
            console.error("Error exchanging code for token:", error);
            return res.status(500).send("Error exchanging code for token");
        }


    });
};