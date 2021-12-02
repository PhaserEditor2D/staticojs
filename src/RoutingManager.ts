import { readFileSync } from "fs";
import M, { Minimatch } from "minimatch";

interface IRule {
    pattern: string;
    view: string;
}

export class RoutingManager {

    private _rules: IRule[];

    constructor() {

        this._rules = [];
    }

    readFromFile(file: string) {

        const spec = readFileSync(file).toString();

        this.readFromSpec(spec);
    }

    readFromSpec(spec: string) {

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

    private _cache: Map<string, M.IMinimatch> = new Map();

    compileRules() {

        console.log("[RoutingManager]")
        console.log(this._rules);

        for (const rule of this._rules) {

            const match = new Minimatch(rule.pattern);
            this._cache.set(rule.pattern, match);
        }
    }

    findViewFor(pagePath: string) {

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