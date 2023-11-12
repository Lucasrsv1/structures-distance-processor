const axios = require("axios");
const chalk = require("chalk");

const NAMING_URL = `${process.env.MANAGER_URL}/processors/register`;

/**
 * Registra este processador no gerenciador de estruturas para poder acessá-lo
 * @returns {Promise<void>}
 */
async function registerProcessor () {
	console.log("Registering this processor...");

	try {
		const response = await axios({
			method: "post",
			url: NAMING_URL,
			timeout: 60000
		});

		if (response.status !== 201)
			return console.error("Couldn't register this processor:", response.data);

		const { token, id } = response.data;
		if (!token)
			return console.error("No token returned by manager:", response.data);

		global.accessToken = token;
		console.log("Got token and ID from manager. UUID for this processor:", chalk.bold(chalk.green(id)));
	} catch (error) {
		console.error("Couldn't register this processor:", error);
	}
}

module.exports = { registerProcessor };
