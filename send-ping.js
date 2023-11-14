const axios = require("axios");

const NAMING_URL = `${process.env.MANAGER_URL}/structures/ping`;

/**
 * Informa o servidor que o processador continua em execução e processando uma determinada lista de estruturas
 * @returns {Promise<void>}
 */
async function sendPing () {
	// Lista de nomes das estruturas em processamento
	const filenames = Object.keys(global.filenames);

	if (!filenames || !filenames.length)
		return console.info("No ping to send, no structures being processed.");

	console.log("Sending ping from this processor to server...", filenames);

	try {
		const response = await axios({
			method: "patch",
			url: NAMING_URL,
			data: { filenames },
			timeout: 60000,
			headers: {
				"x-access-token": global.accessToken
			}
		});

		if (response.status !== 202)
			return console.error("Couldn't send ping to server:", response.data);

		console.log("Ping sent to server");
	} catch (error) {
		console.error("Couldn't send ping to server:", error);
	}
}

module.exports = { sendPing };
