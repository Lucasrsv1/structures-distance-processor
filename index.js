// Configura variáveis de ambiente o mais cedo possível
require("dotenv").config();

// Configura estampa de tempo dos logs
require("console-stamp")(console, {
	format: ":date(yyyy-mm-dd HH:MM:ss.l).yellow :mode.magenta :label",
	tokens: {
		mode () { return `[${global.runningMode}]`; }
	}
});

const os = require("os");

const { ProcessingModes } = require("./processing-modes");
const { registerProcessor } = require("./register-processor");
const { sendPing } = require("./send-ping");
const { start } = require("./processor");

const availableParallelism = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
global.QTY_CPUS = Math.max(1, process.env.QTY_CPUS || availableParallelism);

(async () => {
	global.runningMode = ProcessingModes.MULTI_FILES;
	await registerProcessor();

	// Envia de minuto em minuto o ping para o servidor informando que o processador continua em execução
	global.filenames = {};
	setInterval(sendPing, 60000);

	start();
})();
