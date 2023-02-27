import { gRPCGetMCStatus, ServerInfo } from "./GetMCStatusGRPCClient.js";

const serverInfo: ServerInfo = {
    host: "mc.basmc.ca",
    port: 25565,
    query_port: 25565,
    is_bedrock: false,
};

console.log(await gRPCGetMCStatus(serverInfo));