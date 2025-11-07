export interface CredentialRequest {
    action: string;
    email?: string;
    password?: string;
    website?: string;
}

export interface FillCredentialsPayload {
    action: "fillCredentials";
    email: string;
    password: string;
    website?: string;
}