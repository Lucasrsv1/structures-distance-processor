const axios = require("axios");
const { createWriteStream, rmSync, existsSync, unlinkSync } = require("fs");
const path = require("path");
const stream = require("stream");
const { promisify } = require("util");

const { timeFormat } = require("../utils");

const finished = promisify(stream.finished);

const RCSB_URL = process.env.RCSB_URL;

const outputFolder = path.resolve(__dirname, "..", "downloaded-files");

/**
 * Realiza o download do arquivo comprimido de uma estrutura
 * @param {string} structure Nome do arquivo comprimido da estrutura
 * @returns {Promise<boolean>} Informa se o arquivo foi baixado com sucesso
 */
async function downloadStructure (structure) {
	const fileURL = `${RCSB_URL}/${structure}`;
	const filepath = path.resolve(outputFolder, structure);

	try {
		const start = Date.now();
		console.log(`[${structure}] Downloading structure...`);

		const writer = createWriteStream(filepath);
		const response = await axios({
			method: "get",
			url: fileURL,
			responseType: "stream",
			timeout: 60000
		});

		response.data.pipe(writer);
		await finished(writer);

		console.log(`[${structure}] Structure downloaded in ${timeFormat(Date.now() - start)}.`);
		return true;
	} catch (error) {
		if (existsSync(filepath))
			rmSync(filepath, { force: true });

		console.error(`[${structure}] Error downloading structure:`, error);
		return false;
	}
}

/**
 * Deleta os arquivos com os dados de uma estrutura
 * @param {string} structure Nome do arquivo comprimido da estrutura
 */
function deleteStructureFiles (structure) {
	const start = new Date();
	const filepath = path.resolve(outputFolder, structure.replace(".gz", ""));
	const gzFilepath = path.resolve(outputFolder, structure);

	if (existsSync(filepath))
		unlinkSync(filepath);

	if (existsSync(gzFilepath))
		unlinkSync(gzFilepath);

	console.log(`[${structure}] Files deleted in ${timeFormat(Date.now() - start)}.`);
}

module.exports = { deleteStructureFiles, downloadStructure };
