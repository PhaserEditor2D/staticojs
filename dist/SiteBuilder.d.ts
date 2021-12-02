export declare class SiteBuilder {
    private _config;
    private _contentRoot;
    private _mdConverter;
    private _outputDir;
    private _homePage?;
    private _themeDir;
    private _templatesDir;
    private _routingManager;
    constructor(projectDir: string);
    parse(): IPage;
    compile(): Promise<void>;
    private boostPageData;
    private generatePage;
    private readPage;
}
