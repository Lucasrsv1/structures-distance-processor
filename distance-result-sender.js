const axios = require("axios");
const chalk = require("chalk");

const { resultFormat, timeFormat } = require("./utils");

const RESULT_URL = `${process.env.MANAGER_URL}/structures/result`;

/**
 * Envia para o servidor o resultado com a menor distância encontrada
 * @param {number} result Menor distância encontrada
 * @param {number} processingTime Tempo de execução do processamento da estrutura
 * @param {string} filename Nome da estrutura processada
 * @returns {Promise<void>}
 */
async function sendDistanceResult (result, processingTime, filename) {
	const start = Date.now();
	console.log(`[${filename}] Sending result to server: ${resultFormat(result)}`);

	try {
		const response = await axios({
			method: "post",
			url: RESULT_URL,
			data: { filename, result, processingTime },
			timeout: 60000,
			headers: {
				"x-access-token": global.accessToken
			}
		});

		if (response.status === 201 && response.data.success) {
			if (response.data.isNewMinDistance)
				console.log(chalk.bold(chalk.green(`[${filename}] Current global minimum distance set to ${result}!`)));

			console.log(`[${filename}] Result sent to server in ${timeFormat(Date.now() - start)}.`);
			return;
		}

		console.error(`[${filename}] Got status ${response.status} from server, and the following response:`, response.data);
	} catch (error) {
		console.error(`[${filename}] Couldn't send result to server:`, error);
	}
}

module.exports = { sendDistanceResult };
