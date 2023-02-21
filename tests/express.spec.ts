import { defaultRoute, serverStatusRoute, serverIconRoute } from "../lib/express.js";


describe("defaultRoute function", () => {
    it("responds to /", async () => {
        const req = {
            accept: {
                types: () => { return "text/html"; }
            }
        };
        const res = {
            text: "",
            type: (type) => { res.type = type; return res; },
            status: (status) => { res.status = status; return res; },
            send: (body) => { res.text = body; return res; }
        };
        const next = () => { return; };

        await defaultRoute(req, res, next);

        expect(res.type).toBe("text/html");
        expect(res.status).toBe(200);
        expect(res.text).toContain("https://api.neuralnexus.dev/api/mcstatus/your.server.ip");
    });
});

describe("serverStatusRoute", () => {
    const req = { params: { address: "mc.basmc.ca" }, query: {}, get: {} };
    const res = { text: {}, type: {}, status: {}, send: {}, json: {} };
    const next = () => { return; };

    it("responds to /:address accept=undefined", async () => {
        req["accept"] = undefined;
        req.get = (header) => { return req[header]; }

        res.type = (type) => { res.type = type; return res; };
        res.status = (status) => { res.status = status; return res; };
        res.send = (body) => { res.text = body; return res; };
        res.json = (body) => { res.text = JSON.stringify(body); return res; };

        await serverStatusRoute(req, res, next);

        expect(res.type).toBe("text/html");
        expect(res.status).toBe(200);
        expect(res.text).toContain("property=\"og:title\"");
    });

    it("responds to /:address accept=text/html", async () => {
        req["accept"] = ["text/html"];
        req.get = (header) => { return req[header]; }

        res.type = (type) => { res.type = type; return res; };
        res.status = (status) => { res.status = status; return res; };
        res.send = (body) => { res.text = body; return res; };
        res.json = (body) => { res.text = JSON.stringify(body); return res; };

        await serverStatusRoute(req, res, next);

        expect(res.type).toBe("text/html");
        expect(res.status).toBe(200);
        expect(res.text).toContain("Players: ");
    });

    it("responds to /:address accept=application/json", async () => {
        req["accept"] = ["application/json"];
        req.get = (header) => { return req[header]; }

        res.type = (type) => { res.type = type; return res; };
        res.status = (status) => { res.status = status; return res; };
        res.json = (body) => { res.text = JSON.stringify(body); return res; };

        await serverStatusRoute(req, res, next);
        expect(res.type).toBe("application/json");
        expect(res.status).toBe(200);
    });

    it("responds to /:address accept=not/supported", async () => {
        req["accept"] = ["not/supported"];
        req.get = (header) => { return req[header]; }

        res.type = (type) => { res.type = type; return res; };
        res.status = (status) => { res.status = status; return res; };
        res.json = (body) => { res.text = JSON.stringify(body); return res; };

        await serverStatusRoute(req, res, next);
        expect(res.type).toBe("application/json");
        expect(res.status).toBe(400);
        expect(res.text).toContain("Unsupported Accept Headers");
    });
});

describe("serverIconRoute", () => {
    const req = { params: { address: "mc.basmc.ca" }, query: {}, get: {} };
    const res = { text: {}, type: {}, status: {}, send: {}, json: {} };
    const next = () => { return; };

    it("responds to /:address/icon", async () => {
        req.get = (header) => { return req[header]; }

        res.type = (type) => { res.type = type; return res; };
        res.status = (status) => { res.status = status; return res; };
        res.send = (body) => { res.text = body; return res; };
        res.json = (body) => { res.text = JSON.stringify(body); return res; };

        await serverIconRoute(req, res, next);
        expect(res.type).toBe("image/png");
        expect(res.status).toBe(200);
        expect(res.text).toBeInstanceOf(Buffer);
    });
});
