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
Object.defineProperty(exports, "__esModule", { value: true });
const typescript = __importStar(require("typescript"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const transformer = (program) => (transformationContext) => (sourceFile) => {
    const compilerOptions = program.getCompilerOptions();
    const isNodeModuleResolution = compilerOptions.moduleResolution === typescript.ModuleResolutionKind.NodeJs;
    function shouldMutateModuleSpecifier(node) {
        if (!typescript.isImportDeclaration(node) && !typescript.isExportDeclaration(node))
            return false;
        if (node.moduleSpecifier === undefined)
            return false;
        // only when module specifier is valid
        if (!typescript.isStringLiteral(node.moduleSpecifier))
            return false;
        // only when path is relative
        if (!node.moduleSpecifier.text.startsWith('./') && !node.moduleSpecifier.text.startsWith('../'))
            return false;
        // only when module specifier has no extension
        if (path.extname(node.moduleSpecifier.text) !== '')
            return false;
        return true;
    }
    // use node like module resolution on the module specifier for cases where it points to a directory
    // containing an index.ts which would ultimately results in module-specifier/index.js)
    function resolveModuleSpecifier(node) {
        const moduleSpecifier = node.moduleSpecifier.text;
        // only attempt node type resolution when module resolution is node
        if (isNodeModuleResolution) {
            // in case the node has prior transforms get the original node
            const originalNode = typescript.getOriginalNode(node);
            // try the current node first then revert to original node for source file
            const sourceFile = node.getSourceFile() || originalNode.getSourceFile();
            if (sourceFile) {
                const absoluteModuleSpecifier = path.join(path.dirname(sourceFile.fileName), moduleSpecifier);
                // if the module specifier is not pointing to a source file, use
                // node like module resolution to try for <absoluteModuleSpecifier>/index.ts scheme
                if (!fs.existsSync(`${absoluteModuleSpecifier}.ts`) && fs.existsSync(`${absoluteModuleSpecifier}${path.sep}index.ts`)) {
                    return `${moduleSpecifier}${path.sep}index.js`;
                }
            }
        }
        // default to only append .js
        return `${moduleSpecifier}.js`;
    }
    function visitNode(node) {
        if (shouldMutateModuleSpecifier(node)) {
            if (typescript.isImportDeclaration(node)) {
                const newModuleSpecifier = typescript.factory.createStringLiteral(resolveModuleSpecifier(node));
                return typescript.factory.updateImportDeclaration(node, node.decorators, node.modifiers, node.importClause, newModuleSpecifier);
            }
            else if (typescript.isExportDeclaration(node)) {
                const newModuleSpecifier = typescript.factory.createStringLiteral(resolveModuleSpecifier(node));
                return typescript.factory.updateExportDeclaration(node, node.decorators, node.modifiers, false, node.exportClause, newModuleSpecifier);
            }
        }
        return typescript.visitEachChild(node, visitNode, transformationContext);
    }
    return typescript.visitNode(sourceFile, visitNode);
};
exports.default = transformer;
//# sourceMappingURL=index.js.map