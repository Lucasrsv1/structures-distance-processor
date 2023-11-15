// Configura variáveis de ambiente o mais cedo possível
require("dotenv").config();

// Configura estampa de tempo dos logs
require("console-stamp")(console, {
	format: ":date(yyyy-mm-dd HH:MM:ss.l).yellow :mode.magenta :label",
	tokens: {
		mode () { return `[${global.runningMode}]`; }
	}
});

const { ProcessingModes } = require("./processing-modes");
const { registerProcessor } = require("./register-processor");
const { sendPing } = require("./send-ping");
const { start } = require("./processor");

(async () => {
	global.runningMode = ProcessingModes.MULTI_FILES;
	await registerProcessor();

	// Envia de minuto em minuto o ping para o servidor informando que o processador continua em execução
	global.filenames = {};
	setInterval(sendPing, 60000);

	if (process.env.CIF_ONLY === "true")
		global.runningMode = ProcessingModes.SINGLE_FILE;
	else
		global.runningMode = ProcessingModes.MULTI_FILES;

	start();
})();
