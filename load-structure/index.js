const { spawn } = require("child_process");
const path = require("path");

const { downloadStructure } = require("./download-file");
const { timeFormat, sizeFormat } = require("../utils");

const SH_TIMEOUT_PDB = process.env.SH_TIMEOUT_PDB || 25000;
const SH_TIMEOUT_CIF = process.env.SH_TIMEOUT_CIF || 900000;

const outputFolder = path.resolve(__dirname, "..", "downloaded-files");
const extractCoordinatesPDBApp = path.resolve(__dirname, "extract-coordinates-pdb.sh");
const extractCoordinatesCIFApp = path.resolve(__dirname, "extract-coordinates-cif.sh");

/**
 * Carrega as coordenadas dos modelos de uma estrutura
 * @param {string} filename Nome do arquivo comprimido da estrutura
 * @returns {Promise<number[][][] | null>}
 */
async function loadStructure (filename) {
	try {
		const success = await downloadStructure(filename);
		if (!success) return null;

		const coordinates = await _loadStructureCoordinates(filename);
		if (!coordinates) return null;

		return coordinates;
	} catch (error) {
		console.error(`[${filename}] Error processing structure:`, error);
		return null;
	}
}

/**
 * Carrega os dados das coordenadas dos átomos de cada modelo da estrutura
 * @param {string} structure Nome do arquivo comprimido da estrutura
 * @returns {Promise<number[][][] | undefined>} Coordenadas dos átomos de cada modelo da estrutura
 */
function _loadStructureCoordinates (structure) {
	console.log(`[${structure}] Loading coordinates...`);
	const start = Date.now();

	const filepath = path.resolve(outputFolder, structure);
	return new Promise(resolve => {
		let coordinates = [];
		const extractCoordinatesApp = structure.includes(".pdb") ? extractCoordinatesPDBApp : extractCoordinatesCIFApp;
		const timeout = structure.includes(".pdb")? SH_TIMEOUT_PDB : SH_TIMEOUT_CIF;

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

				stdout = models[models.length - 1].trim();
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
		}, timeout);
	});
}

module.exports = { loadStructure };
