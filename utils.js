const chalk = require("chalk");

const sleep = ms => new Promise(res => setTimeout(res, ms));

const resultFormat = result => chalk.bold(chalk.green(result));

const timeFormat = ms => chalk.bold(chalk.red(`${ms} ms`));

const sizeFormat = bytes => chalk.bold(chalk.magenta(`${bytes} bytes`));

module.exports = { sleep, resultFormat, timeFormat, sizeFormat };
