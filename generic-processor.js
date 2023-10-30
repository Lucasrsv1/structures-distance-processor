const os = require("os");
const chalk = require("chalk");

const { getNextStructures } = require("./structures-getter");
const { sendDistanceResult } = require("./distance-result-sender");
const { sleep, removePreviousFiles, handleProcessExit } = require("./utils");
const { createWorker } = require("./create-worker");

const MAXIMUM_PER_MACHINE = 20;

const RUN_INTERVAL = process.env.RUN_INTERVAL || 5000;

const availableParallelism = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
const QTY_CPUS = Math.min(MAXIMUM_PER_MACHINE, Math.max(1, process.env.QTY_CPUS || availableParallelism));

/**
 * @type {Array<{ child: ChildProcess, isBusy: boolean, isReady: boolean, id: number }>}
 */
const CHILDREN = [];

function onMessageFromWorker (child, message) {
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

async function start () {
	handleProcessExit(CHILDREN);

	removePreviousFiles();
	createWorker(CHILDREN, onMessageFromWorker, QTY_CPUS);

	await sleep(5000);
	run();

	const type = chalk.bold(chalk.magenta(process.env.PDB_ONLY === "true"? "PDB" : "Generic"));
	console.log(`${type} distance processor started with interval of ${RUN_INTERVAL} ms`);
}

module.exports = { start };
