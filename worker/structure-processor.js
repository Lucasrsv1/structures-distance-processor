const { calculateMinDistance } = require("./distance");
const { loadStructure } = require("../load-structure");
const { deleteStructureFiles } = require("../load-structure/download-file");
const { resultFormat, timeFormat } = require("../utils");

/**
 * Processa uma estrutura e envia o resultado para o processo pai
 * @param {string} filename Nome do arquivo comprimido da estrutura
 * @returns {Promise<void>}
 */
async function processStructure (filename) {
	const start = Date.now();

	try {
		const coordinates = await loadStructure(filename);
		if (!coordinates) return _sendResponse(filename, false);

		const calculationStart = Date.now();

		let minDistance = Infinity;
		for (const modelCoordinates of coordinates)
			minDistance = Math.min(minDistance, calculateMinDistance(modelCoordinates, 0, modelCoordinates.length));

		// Envia resultado para o processo pai
		_sendResponse(filename, true, minDistance);

		console.log(`[${filename}] The min distance is ${resultFormat(minDistance)} and was calculated in ${timeFormat(Date.now() - calculationStart)}.`);
		console.log(`[${filename}] Finished processing structure in ${timeFormat(Date.now() - start)}.`);
	} catch (error) {
		console.error(`[${filename}] Error processing structure:`, error);
		_sendResponse(filename, false);
	}
}

/**
 * Envia o resultado do processamento para o processo pai
 * @param {string} structure Nome do arquivo comprimido da estrutura
 * @param {boolean} isSuccess Flag que informa se a estrutura foi processada com sucesso ou não
 * @param {number} minDistance Resultado da menor distância entre os átomos da estrutura
 */
function _sendResponse (structure, isSuccess, minDistance = null) {
	deleteStructureFiles(structure);
	process.send({
		finished: true,
		childId: process.env.CHILD_ID,
		failure: !isSuccess,
		result: minDistance,
		filename: structure
	});
}

module.exports = { processStructure };
