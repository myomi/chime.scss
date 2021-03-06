const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const sass = require("node-sass");
const packageImporter = require('node-sass-package-importer');
const util = require("util");
const autoprefixer = require('autoprefixer');
const postcss      = require('postcss');

const readdir = util.promisify(fs.readdir);
const render = util.promisify(sass.render);
const stat = util.promisify(fs.stat);
const rimrafP = util.promisify(rimraf);
const writeFile = util.promisify(fs.writeFile);


main();

/**
 * main process
 */
async function main() {
    findScss("example")
    .then((files) => {
        files.push("chime.scss");
        files.forEach(async (f) => {
            const outFile = f.replace(/\.scss$/, ".css");
            try {
                // clean
                await rimrafP(outFile);
                // sass
                const result = await render({
                    file: f,
                    outputStyle: "expanded",
                    outFile: outFile,
                    indentWidth: 4,
                    sourceMapEmbed: true,
                    importer: packageImporter()
                });
                // autoprefix
                const prefixed = await autoprefix(result.css);
                // write
                await writeFile(outFile, prefixed);
                console.log("build: " + outFile);
            } catch (e) {
                console.error(e.formatted);
            }
        });
    })
    .catch(err => {
        console.error(err.formatted);
    });
}

/**
 * execute autoprefixer
 * 
 * @param {string} css source
 * @returns {string} css autoprefixed
 */
async function autoprefix(css) {
    const result = await postcss([ autoprefixer ]).process(css);
    result.warnings().forEach(function (warn) {
        console.warn(warn.toString());
    });
    return result.css;
}

/**
 * find .scss files from basedir
 * 
 * @param {any} basedir path of the target directory.
 * @returns {Array} array of sccs file path
 */
async function findScss(basedir) {
    const files = await readdir(basedir);

    return Promise.all(files.map(async (f) => {
        const filePath = path.join(basedir, f);
        const status = await stat(filePath);
        if (status.isDirectory()) {
            return await findScss(filePath);
        } else if (status.isFile() && filePath.match(/\.scss$/)) {
            return filePath;
        }
    })).then((result) => {
        // flatten and filtering only scss files.
        return flatten(result).filter((e) => {
            return e;
        });
    });
}

/**
 * flatten nested array
 * 
 * @param {Array} array src
 * @returns {Array} dest
 */
function flatten(array) {
    return array.reduce((p, c) => {
        return Array.isArray(c) ? p.concat(flatten(c)) : p.concat(c);
    }, []);
}

module.exports = main;