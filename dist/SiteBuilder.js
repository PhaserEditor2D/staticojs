"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteBuilder = void 0;
const yaml_1 = require("yaml");
const fs_1 = require("fs");
const path_1 = __importStar(require("path"));
const showdown_1 = __importDefault(require("showdown"));
const ejs_1 = require("ejs");
const copyDir_1 = require("./copyDir");
const RoutingManager_1 = require("./RoutingManager");
class SiteBuilder {
    _config;
    _contentRoot;
    _mdConverter;
    _outputDir;
    _sitePage;
    _pathPageMap;
    _themeDir;
    _templatesDir;
    _routingManager;
    constructor(projectDir) {
        this._mdConverter = new showdown_1.default.Converter({
            metadata: true
        });
        this._outputDir = (0, path_1.join)(projectDir, "www");
        // read config
        const configFile = (0, path_1.join)(projectDir, "config.yaml");
        if (!(0, fs_1.existsSync)(configFile)) {
            throw new Error(`Config file '${configFile}' not found.`);
        }
        this._config = (0, yaml_1.parse)((0, fs_1.readFileSync)(configFile, "utf-8"));
        this._contentRoot = (0, path_1.join)(projectDir, "content", this._config.language);
        if (!(0, fs_1.existsSync)(this._contentRoot)) {
            throw new Error(`Content folder '${this._contentRoot}' not found.`);
        }
        this._themeDir = (0, path_1.join)(projectDir, "themes", this._config.theme);
        if (!(0, fs_1.existsSync)(this._themeDir)) {
            throw new Error(`Theme folder '${this._themeDir}' not found.`);
        }
        this._templatesDir = (0, path_1.join)(this._themeDir, "templates");
        if (!(0, fs_1.existsSync)(this._templatesDir)) {
            throw new Error(`Templates folder '${this._templatesDir}' not found`);
        }
        this._routingManager = new RoutingManager_1.RoutingManager();
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
        (0, fs_1.rmSync)(this._outputDir, { recursive: true, force: true });
        (0, fs_1.mkdirSync)(this._outputDir, { recursive: true });
        // copy data
        (0, fs_1.writeFileSync)((0, path_1.join)(this._outputDir, "data.json"), JSON.stringify(this._sitePage, null, 2));
        // add extra data fields
        this.buildPageLinks(this._sitePage);
        // copy static content
        const staticFolder = (0, path_1.join)(this._themeDir, "static");
        if ((0, fs_1.existsSync)(staticFolder)) {
            (0, copyDir_1.copyDir)(staticFolder, this._outputDir);
        }
        else {
            console.warn("WARNING: The theme doesn't have a 'static' folder.");
        }
        const routesFile = (0, path_1.join)(this._themeDir, "routes.conf");
        if (!(0, fs_1.existsSync)(routesFile)) {
            throw new Error(`Routes file '${routesFile}' not found.`);
        }
        this._routingManager.readFromFile(routesFile);
        this._routingManager.compileRules();
        this.generatePage(this._sitePage);
    }
    buildPageLinks(page) {
        if (page.$pages) {
            for (const child of page.$pages) {
                page["__" + child.$name] = child;
                child.$parent = page;
                this.buildPageLinks(child);
            }
        }
    }
    deletePageFromPath(path) {
        const page = this._pathPageMap.get(path);
        if (!page) {
            throw new Error(`Page not found at '${path}'`);
        }
        if (page.$parent) {
            page.$parent.$pages = page.$parent.$pages.filter(p => p !== page);
        }
        this._pathPageMap.delete(path);
        (0, fs_1.rmSync)((0, path_1.join)(this._contentRoot, path), { recursive: true, force: true });
    }
    findPageAssetsFromPath(path) {
        let assets = [];
        this.addPageAssets((0, path_1.join)(this._contentRoot, path, "assets"), assets);
        assets = assets.map(asset => (0, path_1.relative)((0, path_1.join)(this._contentRoot, path), asset));
        return assets;
    }
    addPageAssets(path, list) {
        if (!(0, fs_1.existsSync)(path) || !(0, fs_1.statSync)(path).isDirectory()) {
            return;
        }
        const files = (0, fs_1.readdirSync)(path);
        for (const file of files) {
            const path2 = (0, path_1.join)(path, file);
            if ((0, fs_1.statSync)(path2).isDirectory()) {
                this.addPageAssets(path2, list);
            }
            else {
                list.push(path2);
            }
        }
    }
    async generatePage(page) {
        const outDir = (0, path_1.join)("www", page.$path);
        (0, fs_1.mkdirSync)(outDir, { recursive: true });
        const view = this._routingManager.findViewFor(page.$path);
        if (!view) {
            throw new Error(`New template's view is defined for page '${page.$path}'.`);
        }
        const templateFile = (0, path_1.join)(this._templatesDir, view);
        if (!(0, fs_1.existsSync)(templateFile)) {
            throw new Error(`Template view '${templateFile}' not found.`);
        }
        console.log(`Rendering '${page.$path}' with '${view}'`);
        const output = await (0, ejs_1.renderFile)(templateFile, {
            $page: page,
            site: this._sitePage,
        }, {
            views: [this._templatesDir]
        });
        (0, fs_1.writeFileSync)((0, path_1.join)(outDir, "index.html"), output);
        const assetsDir = (0, path_1.join)(this._contentRoot, page.$path, "assets");
        if ((0, fs_1.existsSync)(assetsDir) && (0, fs_1.statSync)(assetsDir).isDirectory()) {
            const assetsOutDir = (0, path_1.join)(outDir, "assets");
            (0, fs_1.mkdirSync)(assetsOutDir, {
                recursive: true
            });
            (0, copyDir_1.copyDir)(assetsDir, assetsOutDir);
        }
        for (const child of page.$pages) {
            this.generatePage(child);
        }
    }
    findPageFromPath(path) {
        return this._pathPageMap.get(path);
    }
    createPage(parentPath, name, meta) {
        console.log(`Creating page at '${parentPath}/${name}'`);
        const content = "---\n" + (0, yaml_1.stringify)(meta) + "---";
        console.log(content);
        const pageFullPath = (0, path_1.join)(this._contentRoot, parentPath, name);
        (0, fs_1.mkdirSync)(pageFullPath);
        (0, fs_1.mkdirSync)((0, path_1.join)(pageFullPath, "assets"));
        (0, fs_1.writeFileSync)((0, path_1.join)(pageFullPath, "page.md"), content, { encoding: "utf8" });
        const parentPage = this.findPageFromPath(parentPath);
        if (parentPage) {
            this.readPage(parentPage);
            this.buildPageLinks(parentPage);
        }
    }
    savePage(page) {
        console.log(`Saving '${page.$path}'`);
        const meta = {};
        for (const key in page) {
            if (!key.startsWith("$") && !key.startsWith("__")) {
                meta[key] = page[key];
            }
        }
        const content = "---\n" + (0, yaml_1.stringify)(meta) + "---" + page.$summary;
        console.log(content);
        (0, fs_1.writeFileSync)((0, path_1.join)(this._contentRoot, page.$path, "page.md"), content, { encoding: "utf8" });
        this.readPage(page);
        this.buildPageLinks(page);
    }
    readPage(page) {
        console.log(`Processing '${page.$path}'`);
        this._pathPageMap.set(page.$path, page);
        const fullPageDir = (0, path_1.join)(this._contentRoot, page.$path);
        const indexFile = (0, path_1.join)(fullPageDir, "page.md");
        if (!(0, fs_1.existsSync)(indexFile)) {
            throw new Error(`Index file '${indexFile}' not found.`);
        }
        page.$src = (0, fs_1.readFileSync)(indexFile).toString("utf-8");
        page.$content = this._mdConverter.makeHtml(page.$src);
        const metadataSrc = this._mdConverter.getMetadata(true);
        const metadata = (0, yaml_1.parse)(metadataSrc) || {};
        Object.assign(page, metadata);
        const i = page.$src.lastIndexOf("---");
        page.$summary = page.$src.substring(i + 3, i + 3 + 200);
        // process children
        page.$pages = [];
        for (const childPageDir of (0, fs_1.readdirSync)(fullPageDir)) {
            if (childPageDir === "assets") {
                continue;
            }
            if ((0, fs_1.statSync)((0, path_1.join)(fullPageDir, childPageDir)).isDirectory()) {
                const childPage = {
                    $name: childPageDir,
                    $path: path_1.default.posix.join(page.$path, childPageDir),
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
exports.SiteBuilder = SiteBuilder;
