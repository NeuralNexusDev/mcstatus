import { credentials, GrpcObject, loadPackageDefinition } from '@grpc/grpc-js';
import { loadSync, PackageDefinition } from '@grpc/proto-loader';

// Interfaces matching the protobuffs
export interface ServerInfo {
    host?: string,
    port?: number,
    query_port?: number
    is_bedrock?: boolean
}

interface Player {
    name?: string | undefined;
}

export interface StatusResponse {
    name?: string,
    nameHTML?: string,
    map?: string,
    maxplayers?: number,
    onlineplayers?: number,
    players?: Player[],
    connect?: string,
    version?: string,
    favicon?: string,
    server_type?: string
}

// gRPC client setup
const PROTO_PATH = './mcstatus.proto';
const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
};
const packageDefinition: PackageDefinition = loadSync(PROTO_PATH, options);
const Proto: GrpcObject = loadPackageDefinition(packageDefinition);
const Status: any = Proto.Status;

const MCSTATUS_GRPC_PORT: number = <number><unknown>process.env.MCSTATUS_GRPC_PORT || 50051;

// gRPC client
const client = new Status(
    `0.0.0.0:${MCSTATUS_GRPC_PORT}`,
    credentials.createInsecure()
);

// GetMCStatus gRPC call
export function gRPCGetMCStatus(serverInfo: ServerInfo): Promise<StatusResponse> {
    // gRPC client call
    return new Promise((resolve, reject) => {
        client.GetMCStatus(serverInfo, (error: any, response: any) => {
            if (error)
                reject(error);
            resolve(response);
        });
    });
}

// GetMCStatus REST call
export async function RESTGetMCStatus(serverInfo: ServerInfo): Promise<StatusResponse> {
    // Build response address string
    let addressStr = serverInfo.port ? `${serverInfo.host}?port=${serverInfo.port}` : serverInfo.host;
    if (serverInfo.query_port) {
        addressStr = serverInfo.port ? `${addressStr}&query=${serverInfo.query_port}` : `${addressStr}?query=${serverInfo.query_port}`;
        if (serverInfo.is_bedrock) {
            addressStr = `${addressStr}&is_bedrock=${serverInfo.is_bedrock}`;
        }
    } else if (serverInfo.is_bedrock) {
        addressStr = serverInfo.port ? `${addressStr}&is_bedrock=${serverInfo.is_bedrock}` : `${addressStr}?is_bedrock=${serverInfo.is_bedrock}`;
        if (serverInfo.query_port) {
            addressStr = `${addressStr}&query=${serverInfo.query_port}`;
        }
    }

    // Fetch response
    const response = await fetch(`https://api.neuralnexus.dev/api/mcstatus/${addressStr}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
    }});
    const data = await response.json();
    return data;
}

// getMCStatus call
export async function getMCStatus(serverInfo: ServerInfo): Promise<StatusResponse> {
    try {
        return await gRPCGetMCStatus(serverInfo);
    } catch (error) {
        console.error(error);
        return await RESTGetMCStatus(serverInfo);
    }
}
