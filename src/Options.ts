export interface Options {
    readonly autoRefresh: boolean;
    readonly refreshInterval?: number;
    readonly onInit?: () => void;
    readonly onUpdate?: (key: string[]) => void;
}