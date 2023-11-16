const axios = require("axios");

const { ProcessingModes } = require("./processing-modes");
const { registerProcessor } = require("./register-processor");
const { timeFormat } = require("./utils");

const NEXT_STRUCTURE_URL = `${process.env.MANAGER_URL}/structures/next`;

/**
 * Obtém as próximas estruturas do gerenciador e realiza o seu processamento
 * @param {number} qty Quantidade de estruturas a serem solicitadas para o servidor
 * @param {ProcessingModes} mode Modo de processamento a ser usado
 * @returns {Promise<string[]>} Lista de arquivos com as próximas estruturas
 */
async function getNextStructures (qty, mode) {
	console.log("Getting next structures...");
	const start = Date.now();

	try {
		const response = await axios({
			method: "get",
			url: `${NEXT_STRUCTURE_URL}/${qty}/${mode}`,
			timeout: 60000,
			headers: {
				"x-access-token": global.accessToken
			}
		});

		const { filenames, processingMode } = response.data;

		if (processingMode === ProcessingModes.SINGLE_FILE || processingMode === ProcessingModes.MULTI_FILES)
			global.runningMode = processingMode;

		if (!filenames || !filenames.length) {
			console.info("Manager has no more structures to process at the moment.");
			return [];
		}

		console.log(`Got structures from manager in ${timeFormat(Date.now() - start)}.`);
		return filenames;
	} catch (error) {
		if (error && error.response && error.response.status === 403) {
			console.warn("Couldn't get next structures from manager because this processor is not registered.");
			registerProcessor();
		} else {
			console.error("Couldn't get next structures from manager:", error);
		}

		return [];
	}
}

module.exports = { getNextStructures };
