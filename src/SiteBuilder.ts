import { parse, stringify } from "yaml";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeFileSync } from "fs";
import path, { join, relative } from "path";
import Showdown from "showdown";
import { renderFile } from "ejs";
import { copyDir } from "./copyDir";
import { RoutingManager } from "./RoutingManager";

export class SiteBuilder {

    private _config: IConfig;
    private _contentRoot: string;
    private _mdConverter: Showdown.Converter;
    private _outputDir: string;
    private _sitePage?: IPage;
    private _pathPageMap!: Map<string, IPage>;
    private _themeDir: string;
    private _templatesDir: string;
    private _routingManager: RoutingManager;

    constructor(projectDir: string) {

        this._mdConverter = new Showdown.Converter({
            metadata: true
        });

        this._outputDir = join(projectDir, "www");

        // read config

        const configFile = join(projectDir, "config.yaml");

        if (!existsSync(configFile)) {

            throw new Error(`Config file '${configFile}' not found.`);
        }

        this._config = parse(readFileSync(configFile, "utf-8")) as IConfig;

        this._contentRoot = join(projectDir, "content", this._config.language);

        if (!existsSync(this._contentRoot)) {

            throw new Error(`Content folder '${this._contentRoot}' not found.`);
        }

        this._themeDir = join(projectDir, "themes", this._config.theme);

        if (!existsSync(this._themeDir)) {

            throw new Error(`Theme folder '${this._themeDir}' not found.`);
        }

        this._templatesDir = join(this._themeDir, "templates");

        if (!existsSync(this._templatesDir)) {

            throw new Error(`Templates folder '${this._templatesDir}' not found`);
        }

        this._routingManager = new RoutingManager();
    }

    parse() {

        this._sitePage = {
            $name: this._config.title,
            $path: "",
            $pages: [],
            $content: "",
            $summary: "",
            $src: ""
        };

        this._pathPageMap = new Map();

        this.readPage(this._sitePage);

        return this._sitePage;
    }

    async compile() {

        if (!this._sitePage) {

            throw new Error("No data available.");
        }

        // reset www

        rmSync(this._outputDir, { recursive: true, force: true });
        mkdirSync(this._outputDir, { recursive: true });

        // copy data

        writeFileSync(join(this._outputDir, "data.json"), JSON.stringify(this._sitePage, null, 2));

        // add extra data fields

        this.buildPageLinks(this._sitePage);

        // copy static content

        const staticFolder = join(this._themeDir, "static");

        if (existsSync(staticFolder)) {

            copyDir(staticFolder, this._outputDir);

        } else {

            console.warn("WARNING: The theme doesn't have a 'static' folder.");
        }

        const routesFile = join(this._themeDir, "routes.conf");

        if (!existsSync(routesFile)) {

            throw new Error(`Routes file '${routesFile}' not found.`);
        }

        this._routingManager.readFromFile(routesFile);
        this._routingManager.compileRules();

        this.generatePage(this._sitePage);
    }

    buildPageLinks(page: IPage) {

        if (page.$pages) {

            for (const child of page.$pages) {

                (page as any)["__" + child.$name] = child;

                child.$parent = page;

                this.buildPageLinks(child);
            }
        }
    }

    deletePageFromPath(path: string) {

        const page = this._pathPageMap.get(path);

        if (!page) {

            throw new Error(`Page not found at '${path}'`);
        }

        if (page.$parent) {

            page.$parent.$pages = page.$parent.$pages.filter(p => p !== page);
        }

        this._pathPageMap.delete(path);

        rmSync(join(this._contentRoot, path), { recursive: true, force: true });
    }

    findPageAssetsFromPath(path: string) {

        let assets: string[] = [];

        this.addPageAssets(join(this._contentRoot, path, "assets"), assets);

        assets = assets.map(asset => relative(join(this._contentRoot, path), asset));

        return assets;
    }

    private addPageAssets(path: string, list: string[]) {

        if (!existsSync(path) || !statSync(path).isDirectory()) {

            return;
        }

        const files = readdirSync(path);

        for (const file of files) {

            const path2 = join(path, file);

            if (statSync(path2).isDirectory()) {

                this.addPageAssets(path2, list);

            } else {

                list.push(path2);
            }
        }
    }

    private async generatePage(page: IPage) {

        const outDir = join("www", page.$path);

        mkdirSync(outDir, { recursive: true });

        const view = this._routingManager.findViewFor(page.$path);

        if (!view) {

            throw new Error(`New template's view is defined for page '${page.$path}'.`);
        }

        const templateFile = join(this._templatesDir, view);

        if (!existsSync(templateFile)) {

            throw new Error(`Template view '${templateFile}' not found.`);
        }

        console.log(`Rendering '${page.$path}' with '${view}'`);

        const output = await renderFile(templateFile, {
            $page: page,
            site: this._sitePage,
        },
            {
                views: [this._templatesDir]
            });

        writeFileSync(join(outDir, "index.html"), output);

        const assetsDir = join(this._contentRoot, page.$path, "assets");

        if (existsSync(assetsDir) && statSync(assetsDir).isDirectory()) {

            const assetsOutDir = join(outDir, "assets");

            mkdirSync(assetsOutDir, {
                recursive: true
            });

            copyDir(assetsDir, assetsOutDir);
        }

        for (const child of page.$pages) {

            this.generatePage(child);
        }
    }

    findPageFromPath(path: string) {

        return this._pathPageMap.get(path);
    }

    createPage(parentPath: string, name: string, meta: any) {

        console.log(`Creating page at '${parentPath}/${name}'`);

        const content = "---\n" + stringify(meta) + "---";

        console.log(content);

        const pageFullPath = join(this._contentRoot, parentPath, name);

        mkdirSync(pageFullPath);
        mkdirSync(join(pageFullPath, "assets"));

        writeFileSync(join(pageFullPath, "page.md"), content, { encoding: "utf8" });

        const parentPage = this.findPageFromPath(parentPath);

        if (parentPage) {

            this.readPage(parentPage);
            this.buildPageLinks(parentPage);
        }
    }

    savePage(page: IPage) {

        console.log(`Saving '${page.$path}'`);

        const meta: any = {};

        for (const key in page) {

            if (!key.startsWith("$") && !key.startsWith("__")) {

                meta[key] = (page as any)[key];
            }
        }

        const content = "---\n" + stringify(meta) + "---" + page.$summary;

        console.log(content);

        writeFileSync(join(this._contentRoot, page.$path, "page.md"), content, { encoding: "utf8" });

        this.readPage(page);
        this.buildPageLinks(page);
    }

    readPage(page: IPage) {

        console.log(`Processing '${page.$path}'`);

        this._pathPageMap.set(page.$path, page);

        const fullPageDir = join(this._contentRoot, page.$path);
        const indexFile = join(fullPageDir, "page.md");

        if (!existsSync(indexFile)) {

            throw new Error(`Index file '${indexFile}' not found.`);
        }

        page.$src = readFileSync(indexFile).toString("utf-8");
        page.$content = this._mdConverter.makeHtml(page.$src);

        const metadataSrc = this._mdConverter.getMetadata(true) as string;
        const metadata = parse(metadataSrc as string) || {};
        Object.assign(page, metadata);

        const i = page.$src.lastIndexOf("---");
        page.$summary = page.$src.substring(i + 3, i + 3 + 200);

        // process children

        page.$pages = [];

        for (const childPageDir of readdirSync(fullPageDir)) {

            if (childPageDir === "assets") {

                continue;
            }

            if (statSync(join(fullPageDir, childPageDir)).isDirectory()) {

                const childPage: IPage = {
                    $name: childPageDir,
                    $path: path.posix.join(page.$path, childPageDir),
                    $content: "",
                    $summary: "",
                    $src: "",
                    $pages: []
                };

                page.$pages.push(childPage);

                this.readPage(childPage);
            }
        }
    }
}
