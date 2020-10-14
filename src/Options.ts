export interface Options {
    autoRefresh?: boolean;
    refreshInterval?: number;
    onInit?: () => void;
    onUpdate?: (key: string[]) => void;
}