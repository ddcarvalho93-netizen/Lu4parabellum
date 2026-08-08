declare module "cloudflare:workers" {
  export const env: { DB: D1Database };
}
interface Fetcher { fetch(request: Request): Promise<Response> }
interface D1Result { meta: { changes: number } }
interface D1PreparedStatement { bind(...values: unknown[]): D1PreparedStatement; run(): Promise<D1Result> }
interface D1Database { prepare(query: string): D1PreparedStatement }
