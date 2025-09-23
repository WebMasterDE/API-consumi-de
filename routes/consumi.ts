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
            // 3. Scambio del code con access_token e refresh_token
            const tokenResponse = await axios.post(
                new URLSearchParams({
                    grant_type: "authorization_code",
                    code: String(code),
                    redirect_uri: String(process.env.REDIRECT_URI || ""),
                    appkey: String(process.env.APP_ID || ""),
                }).toString(),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );

            console.log("Token response:", tokenResponse);

            const { access_token, refresh_token, expires_in } = tokenResponse.data;

            // Qui puoi salvare i token su DB o sessione
            res.json({ access_token, refresh_token, expires_in });

        } catch (err: any) {
            console.error("Errore nello scambio del token:", err.response?.data || err.message);
            res.status(500).send("Errore durante l'autenticazione");
        }
    });
};