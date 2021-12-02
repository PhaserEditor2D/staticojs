export declare class SiteBuilder {
    private _config;
    private _contentRoot;
    private _mdConverter;
    private _outputDir;
    private _homePage?;
    private _themeDir;
    private _templatesDir;
    constructor();
    private parse;
    generate(): Promise<void>;
    private boostPageData;
    private generatePage;
    private readPage;
}
