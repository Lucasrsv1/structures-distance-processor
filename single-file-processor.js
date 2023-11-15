const { getNextStructures } = require("./structures-getter");
const { loadStructure } = require("./load-structure");
const { sendDistanceResult } = require("./distance-result-sender");

const { resultFormat, timeFormat } = require("./utils");

const { ProcessingModes } = require("./processing-modes");
const { SingleFileProcessingData } = require("./single-file-processing-data");

const _currentResults = new SingleFileProcessingData();

function onMessageFromWorker (CHILDREN, message) {
	_currentResults.pending--;

	if (!message.failure) {
		_currentResults.min = Math.min(_currentResults.min, message.result);
		console.log("Got results from child ID", message.childId);
	} else {
		console.error("Got failure from child ID", message.childId);
		_currentResults.failed = true;
		delete global.filenames[_currentResults.filename];
	}

	if (_currentResults.pending > 0)
		return;

	if (_currentResults.failed) {
		console.error(`[${_currentResults.filename}] Failed to process structure.`);

		_currentResults.done = true;
		delete global.filenames[_currentResults.filename];

		// Libera os filhos pois não foi possível processar a estrutura
		for (const child of CHILDREN)
			child.singleFileLock = false;

		return;
	}

	if (_currentResults.nextModel >= _currentResults.coordinates.length) {
		const processingTime = Date.now() - _currentResults.start;

		console.log(`[${_currentResults.filename}] The min distance is ${resultFormat(_currentResults.min)} and was calculated in ${timeFormat(Date.now() - _currentResults.start)}.`);
		sendDistanceResult(_currentResults.min, processingTime, _currentResults.filename);

		_currentResults.done = true;
		delete global.filenames[_currentResults.filename];

		// Libera os filhos pois acabou o processamento da estrutura
		for (const child of CHILDREN)
			child.singleFileLock = false;
	} else {
		_processModel(CHILDREN);
	}
}

/**
 * Função de execução da lógica de processamento de uma única estrutura de cada vez
 */
async function run (CHILDREN) {
	const qtyBusyChildren = CHILDREN.filter(c => c.isBusy).length;
	if (qtyBusyChildren > 0)
		return console.log(`Still processing structures, ${qtyBusyChildren} remaining...`);

	if (!_currentResults.done)
		return;

	// Aloca os filhos para processarem um arquivo
	for (const child of CHILDREN)
		child.singleFileLock = true;

	try {
		const filenames = await getNextStructures(1, ProcessingModes.SINGLE_FILE);
		if (filenames[0]) {
			global.filenames[filenames[0]] = true;
			_currentResults.initiate(filenames[0]);

			try {
				_currentResults.coordinates = await loadStructure(filenames[0]);

				// Processa as coordenadas obtidas
				if (_currentResults.coordinates)
					return _processModel(CHILDREN);
			} catch (error) {
				console.error(error);
			}

			// Cancela processamento por não ter conseguido obter as coordenadas
			_currentResults.reset();
			delete global.filenames[filenames[0]];
		}
	} catch (error) {
		console.error(error);
	}

	// Libera os filhos pois não foi possível obter ou processar a estrutura
	for (const child of CHILDREN)
		child.singleFileLock = false;
}

function _gaussSum (n) {
	return (n * (n + 1)) / 2;
}

function _divideStructure (CHILDREN, qtyAtoms) {
	const result = [];

	let remaining = qtyAtoms - 1;
	for (let i = 0; i < CHILDREN.length && remaining > 0; i++) {
		const end = Math.floor((-1 + Math.sqrt(1 - (4 * 1 * - 2 * (_gaussSum(remaining) - (_gaussSum(remaining) / (CHILDREN.length - i)))))) / 2 * 1);
		result.push({
			start: (qtyAtoms - 1) - remaining,
			end: (qtyAtoms - 1) - end - 1
		});

		remaining = end;
	}

	return result;
}

function _processModel (CHILDREN) {
	// Divide a tarefa baseado na quantidade de comparações e não na quantidade de átomos
	const modelCoordinates = _currentResults.coordinates[_currentResults.nextModel];
	const modelDivision = _divideStructure(CHILDREN, modelCoordinates.length);

	_currentResults.nextModel++;
	_currentResults.pending = modelDivision.length;

	for (let i = 0; i < modelDivision.length; i++) {
		const start = modelDivision[i].start;
		const end = modelDivision[i].end;

		CHILDREN[i].child.send({
			filename: _currentResults.filename,
			coordinates: modelCoordinates,
			singleFileMode: true,
			start,
			end
		});
		CHILDREN[i].isBusy = true;
	}
}

module.exports = { run, onMessageFromWorker };
