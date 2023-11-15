const { timeFormat } = require("../utils");
const { calculateMinDistance } = require("./distance");

/**
 * Processa uma estrutura e envia o resultado para o processo pai
 * @param {string} filename Nome do arquivo comprimido da estrutura
 * @returns {Promise<void>}
 */
async function processSingleFileStructure (filename, modelCoordinates, start, end) {
	try {
		const calculationStart = Date.now();
		const minDistance = calculateMinDistance(modelCoordinates, start, end);

		// Envia resultado para o processo pai
		_sendResponse(filename, true, minDistance, start, end);

		console.log(`[${filename} - CHUNK] Finished processing structure chunk in ${timeFormat(Date.now() - calculationStart)}.`);
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
function _sendResponse (structure, isSuccess, minDistance = null, start = null, end = null) {
	process.send({
		finished: true,
		childId: process.env.CHILD_ID,
		singleFileMode: true,
		failure: !isSuccess,
		result: minDistance,
		filename: structure,
		start,
		end
	});
}

module.exports = { processSingleFileStructure };
