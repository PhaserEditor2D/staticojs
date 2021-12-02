"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingManager = void 0;
const fs_1 = require("fs");
const minimatch_1 = require("minimatch");
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
        let i = 0;
        while (i < lines.length) {
            this._rules.push({ pattern: lines[i], view: lines[i + 1] });
            i += 2;
        }
    }
    _cache = new Map();
    compileRules() {
        console.log("[RoutingManager]");
        console.log(this._rules);
        for (const rule of this._rules) {
            const match = new minimatch_1.Minimatch(rule.pattern);
            this._cache.set(rule.pattern, match);
        }
    }
    findViewFor(pagePath) {
        for (const rule of this._rules) {
            const match = this._cache.get(rule.pattern);
            if (match) {
                if (match.match(pagePath)) {
                    return rule.view;
                }
            }
        }
        return undefined;
    }
}
exports.RoutingManager = RoutingManager;
