import express from "express";
import bodyParser from "body-parser";
import { MinecraftServerListPing, MinecraftQuery } from "minecraft-status";
import motdParser from '@sfirew/mc-motd-parser'

const port = process.env.PORT || 3000

const app = express();

app.listen(port, () => {
    console.log(`MC Status REST API running on port ${port}`);
});

app.get("/", async (req, res) => {
    try {
        res.type("text/html")
            .status(200)
            .send(`
                <title>NeuralNexus.dev</title>
                <h1>How To:</h1>
                <p>https://api.neuralnexus.dev/api/mcstatus/your.server.ip</p>
                <p>https://api.neuralnexus.dev/api/mcstatus/icon/your.server.ip</p>
            `);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/:address", async (req, res) => {
    try {
        const address = req.params.address;

        // MinecraftQuery.query(address)
        const serverData = await MinecraftServerListPing.ping(4, address)
            .then(response => {
                return response;
            })
            .catch(error => {
                console.log(error);
            });

        const motdhtml = motdParser.JSONToHtml(serverData.description);

        let motdtext = "";
        for (const element of serverData.description.extra) {
            motdtext += element.text
        }

        if (req.get("accept")===undefined) {
            res.type("text/html")
                .status(200)
                .send(`
                <meta content="IP: ${address}" property="og:title" />
                <meta content="Powered by NeuralNexus.dev" property="og:site_name">
                <meta property="og:description" content="
                        ${motdtext}
                        Players: ${serverData.players.online}/${serverData.players.max}
                        Version: ${serverData.version.name}
                        "/>
                <meta content="https://api.neuralnexus.dev/api/mcstatus/${address}" property="og:url" />
                <meta content="https://api.neuralnexus.dev/api/mcstatus/icon/${address}" property="og:image" />
                <meta content="#7C0014" data-react-helmet="true" name="theme-color" />
            `);
        } else if (req.get("accept").includes("text/html")) {
            res.type("text/html")
                .status(200)
                .send(`
                <title>${address}</title>
                ${motdhtml}
                <br>
                <img src="${serverData.favicon}" alt="icon" />
                <p>Players: ${serverData.players.online}/${serverData.players.max}</p>
                <p>Version: ${serverData.version.name}</p>
            `);
        } else {
            res.type("application/json")
                .status(200)
                .json(serverData);
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/icon/:address", async (req, res) => {
    try {
        const address = req.params.address;

        const serverData = await MinecraftServerListPing.ping(4, address)
            .then(response => {
                return response;
            })
            .catch(error => {
                console.log(error);
            });

        res.type("image/png")
            .status(200)
            .send(Buffer.from(serverData.favicon.replace("data:image/png;base64,", ""), 'base64'));
    } catch (err) {
        res.status(500).send(err);
    }
});
