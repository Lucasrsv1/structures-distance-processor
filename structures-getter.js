const axios = require("axios");

const { timeFormat } = require("./utils");
const { registerProcessor } = require("./register-processor");

const NEXT_STRUCTURE_URL = `${process.env.MANAGER_URL}/structures/next`;

/**
 * Obtém as próximas estruturas do gerenciador e realiza o seu processamento
 * @param {number} qty_cpus Quantidade de CPUs usadas para processamento paralelo
 * @returns {Promise<string[]>} Lista de arquivos com as próximas estruturas
 */
async function getNextStructures (qty_cpus) {
	console.log("Getting next structures...");
	const start = Date.now();

	let url = `${NEXT_STRUCTURE_URL}/${qty_cpus}`;
	if (process.env.PDB_ONLY === "true")
		url += "/pdb";
	else if (process.env.CIF_ONLY === "true")
		url += "/cif";

	try {
		const response = await axios({
			method: "get",
			url,
			timeout: 60000,
			headers: {
				"x-access-token": global.accessToken
			}
		});

		if (response.status === 204)
			return console.error("Manager has no more structures to process at the moment.");

		const { filenames } = response.data;
		if (!filenames)
			return console.error("No files returned by manager:", response.data);

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
