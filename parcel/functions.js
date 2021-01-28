require("dotenv").config();
const chalk = require("chalk");
const path = require("path");
const fg = require("fast-glob");
const fs = require("fs-extra");
const watch = require("glob-watcher");
const browserSync = require("browser-sync").create();

const source = path.join(__dirname, "../src/plugin");
const watchFiles = [
  `${source}/**/*.php`,
  `${source}/**/*.txt`,
  `${source}/**/*.svg`,
];

/**
 * Initilize browser sync
 */
const browserInit = () => {
  const { DEV_URL } = process.env;
  browserSync.init({
    proxy: DEV_URL,
    port: 1234,
  });
};

const browserReload = () => browserSync.reload();

/**
 * @param {string} from - Path to the original file
 * @param {string} to - Path to destination directory
 * @param {boolean} reload - Should we run browser sync reload
 */
const moveFile = async (from, to, reload = false) => {
  const slug = from.replace(`${source}/`, "");
  to = `${to}/${slug}`;

  try {
    fs.copySync(from, to);
    console.log(chalk.bgGreenBright.black(`✔ ${slug} moved.`));
    reload && browserReload();
  } catch (err) {
    console.error(err);
  }
};

/**
 * If a DEV_URL is not set in .env we want to hault development on WordPress
 */
const needsDevUrl = () => {
  console.clear();
  console.log(
    chalk.red('🛑 Set "DEV_URL" in your .env file before you can run wordpress')
  );
};

/**
 * When we build production, we want to get our latest tag and replace some
 * variables throughout PHP.
 * @param {string} dir
 * @param {string} tag
 */
const updateVersion = async (dir, tag) => {
  const file = `${dir}/find-my-blocks.php`;
  let result = fs.readFileSync(file, "utf8", (data) => data);
  result = result.replace(/{% VERSION %}/g, tag);
  fs.writeFileSync(file, result, "utf8");
};

/**
 * Watch a glob of files for changes or additions.
 * @param {string} param0 - deconstructed path of output directory
 */
const runWatcher = ({ options: { outDir } }) => {
  const watcher = watch(watchFiles);
  watcher.on("change", (filePath) => moveFile(filePath, outDir, true));
  watcher.on("add", (filePath) => moveFile(filePath, outDir, true));
};

/**
 * Build our production code
 * @param {string} dest - output directory
 */
const build = async (dest) => {
  const stream = fg.stream(watchFiles);
  for await (const entry of stream) {
    await moveFile(entry, dest);
  }
};

module.exports = {
  needsDevUrl,
  updateVersion,
  runWatcher,
  build,
  browserInit,
  browserReload,
};
