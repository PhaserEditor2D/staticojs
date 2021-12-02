"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingManager = void 0;
const fs_1 = require("fs");
class RoutingManager {
    _rules;
    constructor() {
        this._rules = [];
    }
    readFromFile(file) {
        const spec = (0, fs_1.readFileSync)(file).toString();
        this.readFromSpec(spec);
    }
    readFromSpec(spec) {
        const lines = spec.split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .filter(line => !line.startsWith("#"));
        for (const [contentPath, viewPath] of lines) {
            this._rules.push({ contentPath, viewPath });
        }
    }
    compileRoutes() {
        for (const rule of this._rules) {
        }
    }
}
exports.RoutingManager = RoutingManager;
