// Configura variáveis de ambiente o mais cedo possível
require("dotenv").config();

// Configura estampa de tempo dos logs
require("console-stamp")(console, { format: ":date(yyyy-mm-dd HH:MM:ss.l).yellow :label" });

const fs = require("fs");
const path = require("path");
const os = require("os");
const { fork } = require("child_process");

const { getNextStructures } = require("./structures-getter");
const { sendDistanceResult } = require("./distance-result-sender");
const { timeFormat, sleep } = require("./utils");

const MAXIMUM_PER_MACHINE = 20;

const RUN_INTERVAL = process.env.RUN_INTERVAL || 5000;
const REVIVAL_TIMEOUT = process.env.WORKER_REVIVAL_TIMEOUT || 3000;

const availableParallelism = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
const QTY_CPUS = Math.min(MAXIMUM_PER_MACHINE, Math.max(1, process.env.QTY_CPUS || availableParallelism));

/**
 * @type {Array<{ child: ChildProcess, isBusy: boolean, isReady: boolean, id: number }>}
 */
const CHILDREN = [];

const workerPath = path.resolve(__dirname, "./worker/index.js");
const outputFolder = path.resolve(__dirname, "worker", "downloaded-files");

const terminationSignals = [
	"SIGHUP", "SIGINT", "SIGQUIT", "SIGILL", "SIGTRAP", "SIGABRT",
	"SIGBUS", "SIGFPE", "SIGUSR1", "SIGSEGV", "SIGUSR2", "SIGTERM"
];

// Registra eventos de tratamento do término inesperado da aplicação para matar todos os processos filhos
for (const sig of terminationSignals) {
	process.on(sig, () => {
		console.log("Killing the children.");
		for (const { child } of CHILDREN) {
			child.needToDie = true;
			child.kill(9);
		}

		CHILDREN.splice(0);
		process.exit(1);
	});
}

/**
 * Limpa a pasta de download de arquivos
 */
function removePreviousFiles () {
	console.log("Deleting previous files...");
	const start = Date.now();

	if (fs.existsSync(outputFolder))
		fs.rmSync(outputFolder, { force: true, recursive: true });

	fs.mkdirSync(outputFolder);
	console.log(`Previous files deleted in ${timeFormat(Date.now() - start)}.`);
}

/**
 * Cria instâncias de processos filhos para computar as distâncias.
 * @param {number} [qty] quantidade de workers a serem criados
 * @param {number} [startingId] identificador inicial dos consumidores a serem criados
 */
function createWorker (qty = 1, startingId = 1) {
	for (let id = startingId; id < startingId + qty; id++) {
		console.log("Spawning worker", id);

		const childEnv = process.env;
		childEnv.CHILD_ID = id;

		const child = fork(workerPath, {
			cwd: __dirname,
			detached: false,
			env: childEnv
		});

		child.on("message", message => {
			if (!message.finished && !message.started)
				return console.info("Received message:", message);

			const childRef = CHILDREN.find(c => c.child === child);
			if (!childRef)
				return console.error("Couldn't find reference to child ID", message.childId);

			if (message.started) {
				childRef.isReady = true;
				return;
			}

			childRef.isBusy = false;
			if (!message.failure) {
				sendDistanceResult(message.result, message.filename);
				console.log("Got results from child ID", message.childId);
			} else {
				console.error("Got failure from child ID", message.childId);
			}
		});

		child.on("exit", code => {
			const childIdx = CHILDREN.findIndex(c => c.child === child);
			const childId = CHILDREN[childIdx].id;

			CHILDREN.splice(childIdx, 1);
			if (code === 0 || child.needToDie) return;

			setTimeout(createWorker, REVIVAL_TIMEOUT, 1, childId);
		});

		CHILDREN.push({ child, isBusy: false, isReady: false, id });
	}
}

/**
 * Função de execução infinita da lógica de processamento de estruturas
 */
async function run () {
	try {
		const qtyBusyChildren = CHILDREN.filter(c => c.isBusy).length;
		if (qtyBusyChildren > 0)
			console.log(`Still processing structures, ${qtyBusyChildren} remaining...`);

		const availableCPUs = CHILDREN.filter(c => c.isReady && !c.isBusy).length;
		if (availableCPUs > 0) {
			const filenames = await getNextStructures(availableCPUs);
			for (let i = 0; i < filenames.length; i++) {
				const freeChild = CHILDREN.find(c => c.isReady && !c.isBusy);

				// Se não tem filhos livres, cancela processamento das estruturas não enviadas a processos filhos
				// * O servidor irá automaticamente redistribuir as estruturas no futuro
				if (!freeChild) break;

				freeChild.child.send({ filename: filenames[i] });
				freeChild.isBusy = true;
			}
		}
	} catch (error) {
		console.error(error);
	}

	await sleep(RUN_INTERVAL);
	run();
}

(async () => {
	removePreviousFiles();
	createWorker(QTY_CPUS);

	await sleep(5000);
	run();

	console.log(`Distance processor started with interval of ${RUN_INTERVAL} ms`);
})();
