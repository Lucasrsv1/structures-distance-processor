const axios = require("axios");
const { createWriteStream, rmSync, existsSync } = require("fs");
const stream = require("stream");
const { promisify } = require("util");

const { timeFormat } = require("../utils");

const finished = promisify(stream.finished);

/**
 * Realiza o download do arquivo comprimido de uma estrutura
 * @param {string} fileUrl URL do arquivo a ser baixado
 * @param {string} outputPath Caminho para salvar o arquivo
 * @param {string} structure Nome do arquivo comprimido da estrutura
 * @returns {Promise<boolean>} Informa se o arquivo foi baixado com sucesso
 */
async function downloadFile (fileUrl, outputPath, structure) {
	try {
		const start = Date.now();
		console.log(`[${structure}] Downloading structure...`);

		const writer = createWriteStream(outputPath);
		const response = await axios({
			method: "get",
			url: fileUrl,
			responseType: "stream",
			timeout: 60000
		});

		response.data.pipe(writer);
		await finished(writer);

		console.log(`[${structure}] Structure downloaded in ${timeFormat(Date.now() - start)}.`);
		return true;
	} catch (error) {
		if (existsSync(outputPath))
			rmSync(outputPath, { force: true });

		console.error(`[${structure}] Error downloading structure:`, error);
		return false;
	}
}

module.exports = { downloadFile };
