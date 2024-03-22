export interface IContentInfo {
    lang: string;
    fullPath: string;
    homePage: IPage;
}
export declare class SiteBuilder {
    private _config;
    private _contentRoot;
    private _mdConverter;
    private _outputDir;
    private _contents;
    private _themeDir;
    private _templatesDir;
    private _routingManager;
    constructor(projectDir: string);
    parse(): IContentInfo[];
    compile(): Promise<void>;
    private boostPageData;
    private generatePage;
    private readPage;
}
