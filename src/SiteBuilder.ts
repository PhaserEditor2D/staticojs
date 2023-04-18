import { parse } from "yaml";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import path, { join } from "path";
import Showdown from "showdown";
import { renderFile } from "ejs";
import { copyDir } from "./copyDir";
import { RoutingManager } from "./RoutingManager";

export class SiteBuilder {

    private _config: IConfig;
    private _contentRoot: string;
    private _mdConverter: Showdown.Converter;
    private _outputDir: string;
    private _homePage?: IPage;
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

        this._homePage = {
            $name: this._config.title,
            $path: "",
            $rootPath: ".",
            $pages: [],
            $content: "",
            $summary: "",
            $src: "",
            $enabled: true
        };

        this.readPage(this._homePage);

        return this._homePage;
    }

    async compile() {

        if (!this._homePage) {

            throw new Error("No data available.");
        }

        // reset www

        rmSync(this._outputDir, { recursive: true, force: true });
        mkdirSync(this._outputDir, { recursive: true });

        // copy data

        writeFileSync(join(this._outputDir, "data.json"), JSON.stringify(this._homePage, null, 2));

        // add extra data fields

        this.boostPageData(this._homePage);

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

        this.generatePage(this._homePage);
    }

    private boostPageData(page: IPage) {

        if (page.$pages) {

            for (const child of page.$pages) {

                (page as any)["__" + child.$name] = child;

                this.boostPageData(child);
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
            site: this._homePage,
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

    private readPage(page: IPage) {

        console.log(`Processing '${page.$path}'`);

        const fullPageDir = join(this._contentRoot, page.$path);
        const indexFile = join(fullPageDir, "page.md");

        if (!existsSync(indexFile)) {

            throw new Error(`Index file '${indexFile}' not found.`);
        }

        page.$src = readFileSync(indexFile).toString("utf-8");
        page.$content = this._mdConverter.makeHtml(page.$src);

        const metadataSrc = this._mdConverter.getMetadata(true) as string;
        const metadata = parse(metadataSrc as string) || {};
        metadata.$enabled = metadata.enabled === undefined || metadata.enabled;
        Object.assign(page, metadata);
        

        const i = page.$src.lastIndexOf("---");
        page.$summary = page.$src.substring(i + 3, i + 3 + 200);

        // process children

        for (const childPageDir of readdirSync(fullPageDir)) {

            if (childPageDir === "assets") {

                continue;
            }

            if (statSync(join(fullPageDir, childPageDir)).isDirectory()) {

                const childPage: IPage = {
                    $name: childPageDir,
                    $path: path.posix.join(page.$path, childPageDir),
                    $rootPath: path.posix.join(page.$rootPath, ".."),
                    $content: "",
                    $summary: "",
                    $src: "",
                    $enabled: true,
                    $pages: []
                };

                this.readPage(childPage);

                if (childPage.$enabled) {

                    page.$pages.push(childPage);

                } else {

                    console.log(`Disable page '${childPage.$path}'`);
                }
            }
        }
    }
}
