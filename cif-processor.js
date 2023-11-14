const os = require("os");
const chalk = require("chalk");

const { getNextStructures } = require("./structures-getter");
const { sendDistanceResult } = require("./distance-result-sender");
const { sleep, removePreviousFiles, resultFormat, timeFormat, handleProcessExit } = require("./utils");
const { loadStructure } = require("./load-structure");
const { createWorker } = require("./create-worker");
const { CIFProcessingData } = require("./cif-processing-data");

const RUN_INTERVAL = process.env.RUN_INTERVAL || 5000;

const availableParallelism = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
const QTY_CPUS = Math.max(1, process.env.QTY_CPUS || availableParallelism);

/**
 * @type {Array<{ child: ChildProcess, isBusy: boolean, isReady: boolean, id: number }>}
 */
const CHILDREN = [];

const currentResults = new CIFProcessingData();

/**
 * Função de execução infinita da lógica de processamento de estruturas
 */
async function run () {
	try {
		const qtyBusyChildren = CHILDREN.filter(c => c.isBusy).length;
		if (qtyBusyChildren > 0) {
			console.log(`Still processing structures, ${qtyBusyChildren} remaining...`);
		} else if (currentResults.done) {
			const filenames = await getNextStructures(1);
			if (filenames[0]) {
				global.filenames[filenames[0]] = true;
				currentResults.initiate(filenames[0]);

				try {
					currentResults.coordinates = await loadStructure(filenames[0]);
					if (currentResults.coordinates) {
						// Processa as coordenadas obtidas
						processModel();
					} else {
						// Cancela processamento por não ter conseguido obter as coordenadas
						currentResults.reset();
						delete global.filenames[filenames[0]];
					}
				} catch (error) {
					// Cancela processamento por não ter conseguido obter as coordenadas
					currentResults.reset();
					delete global.filenames[filenames[0]];
				}
			}
		}
	} catch (error) {
		console.error(error);
	}

	await sleep(RUN_INTERVAL);
	run();
}

function gaussSum (n) {
	return (n * (n + 1)) / 2;
}

function divideStructure (qtyAtoms) {
	const result = [];

	let remaining = qtyAtoms - 1;
	for (let i = 0; i < CHILDREN.length && remaining > 0; i++) {
		const end = Math.floor((-1 + Math.sqrt(1 - (4 * 1 * - 2 * (gaussSum(remaining) - (gaussSum(remaining) / (CHILDREN.length - i)))))) / 2 * 1);
		result.push({
			start: (qtyAtoms - 1) - remaining,
			end: (qtyAtoms - 1) - end - 1
		});

		remaining = end;
	}

	return result;
}

function processModel () {
	// Divide a tarefa baseado na quantidade de comparações e não na quantidade de átomos
	const modelCoordinates = currentResults.coordinates[currentResults.nextModel];
	const modelDivision = divideStructure(modelCoordinates.length);

	currentResults.nextModel++;
	currentResults.pending = modelDivision.length;

	for (let i = 0; i < modelDivision.length; i++) {
		const start = modelDivision[i].start;
		const end = modelDivision[i].end;

		CHILDREN[i].child.send({ filename: currentResults.filename, start, end, coordinates: modelCoordinates });
		CHILDREN[i].isBusy = true;
	}
}

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
	currentResults.pending--;

	if (!message.failure) {
		currentResults.min = Math.min(currentResults.min, message.result);
		console.log("Got results from child ID", message.childId);
	} else {
		console.error("Got failure from child ID", message.childId);
		currentResults.failed = true;
		delete global.filenames[currentResults.filename];
	}

	if (currentResults.pending > 0)
		return;

	if (currentResults.failed) {
		console.error(`[${currentResults.filename}] Failed to process structure.`);
		currentResults.done = true;
		delete global.filenames[currentResults.filename];
		return;
	}

	if (currentResults.nextModel >= currentResults.coordinates.length) {
		const processingTime = Date.now() - currentResults.start;

		console.log(`[${currentResults.filename}] The min distance is ${resultFormat(currentResults.min)} and was calculated in ${timeFormat(Date.now() - currentResults.start)}.`);
		sendDistanceResult(currentResults.min, processingTime, currentResults.filename);
		currentResults.done = true;
		delete global.filenames[currentResults.filename];
	} else {
		processModel();
	}
}

async function start () {
	handleProcessExit(CHILDREN);

	removePreviousFiles();
	createWorker(CHILDREN, onMessageFromWorker, QTY_CPUS);

	// Aguarda todos os processos filhos estarem prontos
	while (CHILDREN.some(c => !c.isReady))
		await sleep(1000);

	run();
	console.log(`${chalk.bold(chalk.magenta("CIF"))} distance processor started with interval of ${RUN_INTERVAL} ms`);
}

module.exports = { start };
