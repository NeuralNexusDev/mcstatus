import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import motdParser from '@sfirew/mc-motd-parser'
import fs from 'fs';

import { getMCStatus, ServerInfo } from "./mcstatus.js";


// Default route function
export async function defaultRoute(req, res, next) {
    try {
        res.type("text/html")
            .status(200)
            .send(`
            <title>NeuralNexus.dev</title>
            <h1>How To:</h1>
            <p>https://api.neuralnexus.dev/api/mcstatus/your.server.ip</p>
            <p>https://api.neuralnexus.dev/api/mcstatus/your.server.ip?port=25566</p>
            <p>https://api.neuralnexus.dev/api/mcstatus/your.server.ip?port=25566&query=25666</p>
            <p>https://api.neuralnexus.dev/api/mcstatus/icon/your.server.ip</p>
            <p>https://api.neuralnexus.dev/api/mcstatus/icon/your.server.ip?port=25566</p>
        `);
    // Serverside error response
    } catch (err) {
        console.log(err);
        res.type("application/json")
            .status(500)
            .json({ "message": "Internal Server Error", "error": err });
    }
}

// Server status route function
export async function serverStatusRoute(req, res, next) {
    try {
        // Get address and port from request
        const address = req.params.address;
        const port: number = <number><unknown>req.query.port;
        const queryPort: number = <number><unknown>req.query.query;

        // Build response address string
        let addressStr = port ? `${address}?port=${port}` : address;
        addressStr = queryPort ? `${addressStr}?query=${queryPort}` : addressStr;

        // Ignore favicon requests
        if (address==="favicon.ico" || address==="undefined" || address===undefined) return

        // Get server status
        const serverResponse = await getMCStatus({ host: address, port: port, query_port: queryPort });

        // Initialize response variables
        let motdtext: string = motdParser.cleanTags(serverResponse.name);
        let motdhtml: string = serverResponse.nameHTML;
        let players: string = `${serverResponse.onlineplayers}/${serverResponse.maxplayers}`;
        let version: string = serverResponse.version;
        let favicon: string = serverResponse.favicon;

        // Discord embed response
        if (req.get("accept")===undefined) {
            // Http status code based on server status
            if (serverResponse.name !== "Server Offline") {
                res.status(200);
            } else {
                res.status(400);
            }

            res.type("text/html").send(`
                <meta content="IP: ${address}" property="og:title" />
                <meta content="Powered by NeuralNexus.dev" property="og:site_name">
                <meta property="og:description" content="${motdtext}\nPlayers: ${players}\nVersion: ${version}"/>
                <meta content="https://api.neuralnexus.dev/api/mcstatus/${addressStr}" property="og:url" />
                <meta content="https://api.neuralnexus.dev/api/mcstatus/icon/${addressStr}" property="og:image" />
                <meta content="#7C0014" data-react-helmet="true" name="theme-color" />
            `);

        // HTML response
        } else if (req.get("accept")?.includes("text/html")) {
            // Http status code based on server status
            if (serverResponse.name !== "Server Offline") {
                res.status(200);
            } else {
                res.status(400);
            }

            const serverIcon: string = favicon ? `<img src="${favicon}" alt="Server Icon" />` : `<img src="https://api.neuralnexus.dev/api/mcstatus/icon/${addressStr}" alt="Server Icon" />`;
            res.type("text/html")
                .send(`
                <title>${port ? `${address}:${port}` : address}</title>
                ${motdhtml}
                <br>
                ${serverIcon}
                <p>Players: ${players}</p>
                <p>Version: ${version}</p>
            `);

        // JSON response
        } else if (req.get("accept")?.includes("application/json")) {
            // Http status code based on server status
            if (serverResponse.name !== "Server Offline") {
                res.status(200);
            } else {
                res.status(400);
            }

            res.type("application/json")
                .json(serverResponse);

        // Unsupported response
        } else {
            res.type("application/json")
                .status(400)
                .json({ "message": "Unsupported Accept Headers", "error": {} });
        }

    // Serverside error response
    } catch (err) {
        console.log(err);
        res.type("application/json")
            .status(500)
            .json({ "message": "Internal Server Error", "error": err });
    }
}

// Server icon route function
export async function serverIconRoute(req, res, next) {
    try {
        // Get address and port from request
        const serverInfo: ServerInfo = {
            host: req.params.address,
            port: <number><unknown>req.query.port,
            query_port: <number><unknown>req.query.query
        }

        // Build response address string
        let addressStr = serverInfo.port ? `${serverInfo.host}?port=${serverInfo.port}` : serverInfo.host;
        addressStr = serverInfo.query_port ? `${addressStr}?query=${serverInfo.query_port}` : addressStr;

        // Get server status
        const serverResponse = await getMCStatus(serverInfo);

        // Send favicon
        if (serverResponse?.favicon!==undefined && serverResponse.favicon!=="") {
            res.type("image/png")
                .status(200)
                .send(Buffer.from(serverResponse.favicon, "base64"));
        } else {
            res.type("application/json")
                .status(404)
                .json({ "message": "Server favicon not found", "error": {} });
        }

    // Serverside error response
    } catch (err) {
        console.log(err);
        res.type("application/json")
            .status(500)
            .json({ "message": "Internal Server Error", "error": err });
    }
}

// Configure/start REST API/Webserver
export const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Default route
app.get("/", defaultRoute);

// Server status route
app.get("/:address", serverStatusRoute);

// Icon endpoint
app.get("/icon/:address", serverIconRoute);