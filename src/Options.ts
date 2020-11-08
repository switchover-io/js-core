export interface Options {
    autoRefresh?: boolean;
    refreshInterval?: number;
    /** @deprecated */onInit?: () => void;
    onUpdate?: (key: string[]) => void;
}