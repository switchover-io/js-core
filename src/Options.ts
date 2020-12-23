import { ResponseCache } from "./Cache";

export interface Options {
    autoRefresh?: boolean;
    refreshInterval?: number;
    ttl?: number;
    onUpdate?: (key: string[]) => void;
}