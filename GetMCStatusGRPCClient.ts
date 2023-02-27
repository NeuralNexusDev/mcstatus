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


// SendCommand gRPC call
export function gRPCGetMCStatus(message: ServerInfo): Promise<StatusResponse> {
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

    // gRPC client call
    return new Promise((resolve, reject) => {
        client.GetMCStatus(message, (error: any, response: any) => {
            if (error)
                reject(error);
            resolve(response);
        });
    });
}
