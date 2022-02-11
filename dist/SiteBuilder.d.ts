export declare class SiteBuilder {
    private _config;
    private _contentRoot;
    private _mdConverter;
    private _outputDir;
    private _sitePage?;
    private _pathPageMap;
    private _themeDir;
    private _templatesDir;
    private _routingManager;
    constructor(projectDir: string);
    parse(): IPage;
    compile(): Promise<void>;
    buildPageLinks(page: IPage): void;
    deletePageFromPath(path: string): void;
    findPageAssetsFromPath(path: string): string[];
    private addPageAssets;
    private generatePage;
    findPageFromPath(path: string): IPage | undefined;
    createPage(parentPath: string, name: string, meta: any): void;
    savePage(page: IPage): void;
    readPage(page: IPage): void;
}
