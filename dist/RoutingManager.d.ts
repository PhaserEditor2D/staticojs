export declare class RoutingManager {
    private _rules;
    constructor();
    readFromFile(file: string): void;
    readFromSpec(spec: string): void;
    private _cache;
    compileRules(): void;
    findViewFor(pagePath: string): string | undefined;
}
