const fs = require("fs");
const chalk = require("chalk");
const path = require("path");
const { ChildProcess } = require("child_process");

const { unregisterProcessor } = require("./register-processor");

const outputFolder = path.resolve(__dirname, "downloaded-files");

const sleep = ms => new Promise(res => setTimeout(res, ms));

const resultFormat = result => chalk.bold(chalk.green(result));

const timeFormat = ms => chalk.bold(chalk.red(`${ms} ms`));

const sizeFormat = bytes => chalk.bold(chalk.magenta(`${bytes} bytes`));

/**
 * Limpa a pasta de download de arquivos
 */
function removePreviousFiles () {
	console.log("Deleting previous files...");
	const start = Date.now();

	try {
		if (fs.existsSync(outputFolder))
			fs.rmSync(outputFolder, { force: true, recursive: true });

		fs.mkdirSync(outputFolder);
		console.log(`Previous files deleted in ${timeFormat(Date.now() - start)}.`);
	} catch (error) {
		console.error("Couldn't delete previous files:", error);
	}
}

/**
 * Trata o término da aplicação finalizando os processos filhos
 * @param {ChildProcess[]} childProcesses Vetor de processos filhos
 */
function handleProcessExit (childProcesses) {
	const terminationSignals = [
		"SIGHUP", "SIGINT", "SIGQUIT", "SIGILL", "SIGTRAP", "SIGABRT",
		"SIGBUS", "SIGFPE", "SIGUSR1", "SIGSEGV", "SIGUSR2", "SIGTERM"
	];

	// Registra eventos de tratamento do término inesperado da aplicação para matar todos os processos filhos
	for (const sig of terminationSignals) {
		process.on(sig, async () => {
			const lastWill = unregisterProcessor();

			console.log("Killing the children.");
			for (const { child } of childProcesses) {
				child.needToDie = true;
				child.kill(9);
			}

			childProcesses.splice(0);

			await lastWill;
			process.exit(1);
		});
	}
}

module.exports = {
	handleProcessExit,
	sleep,
	resultFormat,
	removePreviousFiles,
	timeFormat,
	sizeFormat
};
