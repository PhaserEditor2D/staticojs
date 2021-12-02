export declare class RoutingManager {
    private _rules;
    constructor();
    readFromFile(file: string): void;
    readFromSpec(spec: string): void;
    compileRoutes(): void;
}
