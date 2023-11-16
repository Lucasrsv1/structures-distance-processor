const axios = require("axios");
const chalk = require("chalk");
const { ProcessingModes } = require("./processing-modes");

const NAMING_REGISTER_URL = `${process.env.MANAGER_URL}/processors/register`;
const NAMING_UNREGISTER_URL = `${process.env.MANAGER_URL}/processors/unregister`;

/**
 * Registra este processador no gerenciador de estruturas para poder acessá-lo
 * @returns {Promise<void>}
 */
async function registerProcessor () {
	console.log("Registering this processor...");

	try {
		const response = await axios({
			method: "post",
			url: NAMING_REGISTER_URL,
			data: { qtyCPUs: global.QTY_CPUS },
			timeout: 60000
		});

		if (response.status !== 201)
			return console.error("Couldn't register this processor:", response.data);

		const { id, token, processingMode } = response.data;
		if (!token)
			return console.error("No token returned by manager:", response.data);

		if (processingMode === ProcessingModes.SINGLE_FILE || processingMode === ProcessingModes.MULTI_FILES)
			global.runningMode = processingMode;

		global.accessToken = token;
		console.log("Got token and ID from manager. UUID for this processor:", chalk.bold(chalk.green(id)));
	} catch (error) {
		console.error("Couldn't register this processor:", error);
	}
}

/**
 * Remove este processador do gerenciador de estruturas
 * @returns {Promise<void>}
 */
async function unregisterProcessor () {
	console.log("Removing this processor...");

	try {
		const response = await axios({
			method: "delete",
			url: NAMING_UNREGISTER_URL,
			timeout: 60000,
			headers: {
				"x-access-token": global.accessToken
			}
		});

		if (response.status !== 200 || !response.data || !response.data.success)
			return console.error("Couldn't unregister this processor:", response.data);

		console.log(chalk.bold(chalk.red("This processor has been unregistered from server.")));
	} catch (error) {
		console.error("Couldn't unregister this processor:", error);
	}
}

module.exports = { registerProcessor, unregisterProcessor };
