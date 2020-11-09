export interface Options {
    autoRefresh?: boolean;
    refreshInterval?: number;
    onUpdate?: (key: string[]) => void;
}