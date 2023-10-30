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
				currentResults.initiate(filenames[0]);

				currentResults.coordinates = await loadStructure(filenames[0]);
				if (currentResults.coordinates) {
					// Processa as coordenadas obtidas
					processModel();
				} else {
					// Cancela processamento por não ter conseguido obter as coordenadas
					currentResults.reset();
				}
			}
		}
	} catch (error) {
		console.error(error);
	}

	await sleep(RUN_INTERVAL);
	run();
}

function processModel () {
	// TODO: dividir tarefa baseado em comparações e não em quantidade de átomos
	const modelCoordinates = currentResults.coordinates[currentResults.nextModel];
	const step = Math.max(1, Math.round(modelCoordinates.length / CHILDREN.length));

	currentResults.nextModel++;
	currentResults.pending = CHILDREN.length;

	for (let i = 0; i < CHILDREN.length; i++) {
		const start = step * i;
		if (start > modelCoordinates.length - 2) {
			// Nada mais para ser processado
			currentResults.pending--;
			break;
		}

		const end = Math.min(modelCoordinates.length - 1, start + step - 1);

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
	if (!message.failure) {
		currentResults.pending--;
		currentResults.min = Math.min(currentResults.min, message.result);
		console.log("Got results from child ID", message.childId);

		if (currentResults.pending <= 0) {
			if (currentResults.nextModel >= currentResults.coordinates.length) {
				console.log(`[${currentResults.filename} - CHUNK] The min distance is ${resultFormat(currentResults.min)} and was calculated in ${timeFormat(Date.now() - currentResults.start)}.`);
				sendDistanceResult(currentResults.min, currentResults.filename);
				currentResults.done = true;
			} else {
				processModel();
			}
		}
	} else {
		console.error("Got failure from child ID", message.childId);
		// TODO: reagendar execução do processamento da parte da estrutura que deu erro
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
