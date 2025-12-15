export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
} as const;

export const CACHE = {
    /** Default stale time for queries (1 minute) */
    STALE_TIME: 60 * 1000,
} as const;

export const API = {
    /** Request timeout in milliseconds */
    TIMEOUT: 10000,
} as const;

export enum Path {
    ADMIN_DASHBOARD = "/",
    LOGIN = "/login",
    SIGNUP = "/signup",
}