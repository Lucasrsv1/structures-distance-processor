const { createWorker } = require("./create-worker");
const multiFilesProcessor = require("./multi-files-processor");
const singleFileProcessor = require("./single-file-processor");

const { sleep, removePreviousFiles, handleProcessExit } = require("./utils");
const { ProcessingModes } = require("./processing-modes");

const RUN_INTERVAL = process.env.RUN_INTERVAL || 5000;

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
	if (message.multiFilesMode)
		multiFilesProcessor.onMessageFromWorker(message);
	else
		singleFileProcessor.onMessageFromWorker(CHILDREN, message);
}

/**
 * Função de execução infinita da lógica de processamento de estruturas
 */
async function run () {
	if (global.runningMode === ProcessingModes.MULTI_FILES)
		await multiFilesProcessor.run(CHILDREN);
	else
		await singleFileProcessor.run(CHILDREN);

	await sleep(RUN_INTERVAL);
	run();
}

async function start () {
	handleProcessExit(CHILDREN);

	removePreviousFiles();
	createWorker(CHILDREN, onMessageFromWorker, global.QTY_CPUS);

	// Aguarda todos os processos filhos estarem prontos
	while (CHILDREN.some(c => !c.isReady))
		await sleep(1000);

	run();
	console.log(`Distance processor started with interval of ${RUN_INTERVAL} ms`);
}

module.exports = { start };
