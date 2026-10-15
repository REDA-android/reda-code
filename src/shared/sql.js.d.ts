declare module 'sql.js' {
  export interface QueryExecResult {
    columns: string[]
    values: any[][]
  }

  export interface Statement {
    step(): boolean
    get(params?: any[] | Record<string, any>): any[]
    getColumnNames(): string[]
    getAsObject(params?: any[] | Record<string, any>): Record<string, any>
    bind(values?: any[] | Record<string, any>): boolean
    reset(): void
    free(): boolean
  }

  export interface Database {
    run(sql: string, params?: any[] | Record<string, any>): Database
    exec(sql: string, params?: any[] | Record<string, any>): QueryExecResult[]
    prepare(sql: string, params?: any[] | Record<string, any>): Statement
    export(): Uint8Array
    close(): void
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>
}
