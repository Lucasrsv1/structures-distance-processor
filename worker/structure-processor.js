const { spawn } = require("child_process");
const { existsSync, unlinkSync } = require("fs");
const path = require("path");

const { downloadFile } = require("./download-file");
const { calculateMinDistance } = require("./distance");
const { resultFormat, timeFormat, sizeFormat } = require("../utils");

const RCSB_URL = process.env.RCSB_URL;
const SH_TIMEOUT = process.env.SH_TIMEOUT || 25000;

const outputFolder = path.resolve(__dirname, "downloaded-files");
const extractCoordinatesPDBApp = path.resolve(__dirname, "extract-coordinates-pdb.sh");
const extractCoordinatesCIFApp = path.resolve(__dirname, "extract-coordinates-cif.sh");

/**
 * Processa uma estrutura e envia o resultado para o processo pai
 * @param {string} filename Nome do arquivo comprimido da estrutura
 * @returns {Promise<void>}
 */
async function processStructure (filename) {
	const start = Date.now();

	try {
		const success = await _downloadStructure(filename);
		if (!success) return _sendResponse(filename, false);

		const coordinates = await _loadStructureCoordinates(filename);
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
	_clearStructureFiles(structure);
	process.send({
		finished: true,
		childId: process.env.CHILD_ID,
		failure: !isSuccess,
		result: minDistance,
		filename: structure
	});
}

/**
 * Faz o download do arquivo comprimido com os dados de uma estrutura
 * @param {string} structure Nome do arquivo comprimido da estrutura
 * @returns {Promise<boolean>} Informa se o download foi concluído com sucesso ou não
 */
async function _downloadStructure (structure) {
	const fileURL = `${RCSB_URL}/${structure}`;
	const filepath = path.resolve(outputFolder, structure);

	const success = await downloadFile(fileURL, filepath, structure);
	return success;
}

/**
 * Deleta os arquivos com os dados de uma estrutura
 * @param {string} structure Nome do arquivo comprimido da estrutura
 */
function _clearStructureFiles (structure) {
	const start = new Date();
	const filepath = path.resolve(outputFolder, structure.replace(".gz", ""));
	const gzFilepath = path.resolve(outputFolder, structure);

	if (existsSync(filepath))
		unlinkSync(filepath);

	if (existsSync(gzFilepath))
		unlinkSync(gzFilepath);

	console.log(`[${structure}] Files deleted in ${timeFormat(Date.now() - start)}.`);
}

/**
 * Carrega os dados das coordenadas dos átomos de cada modelo da estrutura
 * @param {string} structure Nome do arquivo comprimido da estrutura
 * @returns {Promise<number[][][]>} Coordenadas dos átomos de cada modelo da estrutura
 */
function _loadStructureCoordinates (structure) {
	console.log(`[${structure}] Loading coordinates...`);
	const start = Date.now();

	const filepath = path.resolve(outputFolder, structure);
	return new Promise(resolve => {
		let coordinates = [];
		const extractCoordinatesApp = structure.includes(".pdb") ? extractCoordinatesPDBApp : extractCoordinatesCIFApp;

		let stdout = "";
		let stdoutSize = 0;
		let chunksCounter = 0;
		let isValidOutput = false;
		let child = spawn(extractCoordinatesApp, [filepath]);

		child.stderr.on("data", error => {
			console.error(`[${structure}] [ShellScript App] Couldn't extract coordinates for structure:`, error);
			return resolve(undefined);
		});

		child.stdout.on("data", data => {
			chunksCounter++;
			stdoutSize += data.length;

			data = data.toString();
			if (data.startsWith("EXTRACTED COORDINATES")) {
				isValidOutput = true;
				data = data.substring(21).trim();
			}

			if (!isValidOutput)
				return console.error(`[${structure}] [ShellScript App] Unexpected output: "${data}"`);

			// Adiciona dados recebidos aos que já foram recebidos
			stdout += data;

			// Se já tiver recebido mais de um modelo, processa o(s) modelo(s) que já está(ão)
			// completo(s) e o(s) remove da string de saída da aplicação ShellScript
			const models = stdout.split("MODEL").filter(m => m.length > 0);
			if (models.length > 1) {
				for (let i = 0; i < models.length - 1; i++) {
					coordinates.push(models[i].trim().split("\n").map(
						atom => atom.split(" ").map(coordinate => Number(coordinate))
					));
				}

				stdout = models[models.length - 1];
			}
		});

		child.on("close", code => {
			// Limpa variável para não matar um processo que já terminou
			child = undefined;
			console.log(`[${structure}] [ShellScript App] Total output size: ${sizeFormat(stdoutSize)}.`);
			console.log(`[${structure}] [ShellScript App] Quantity of chunks: ${chunksCounter}.`);
			console.log(`[${structure}] [ShellScript App] Finished with termination code: ${code}.`);

			if (!isValidOutput)
				return resolve(undefined);

			coordinates = coordinates.concat(stdout.split("MODEL").filter(m => m.length > 0).map(
				model => model.trim().split("\n").map(
					atom => atom.split(" ").map(coordinate => Number(coordinate))
				)
			));

			console.log(`[${structure}] Coordinates loaded in ${timeFormat(Date.now() - start)}.`);
			resolve(coordinates);
		});

		// Garante que o processo filho vai terminar em tempo hábil, nem que seja com erro
		setTimeout(() => {
			if (child) {
				child.kill();
				resolve(undefined);
			}
		}, SH_TIMEOUT);
	});
}

module.exports = { processStructure };
