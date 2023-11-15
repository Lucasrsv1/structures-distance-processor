// Configura variáveis de ambiente o mais cedo possível
require("dotenv").config();

const { ProcessingModes } = require("../processing-modes");

let runningMode = ProcessingModes.UNDEFINED;

// Configura estampa de tempo dos logs
require("console-stamp")(console, {
	format: `:date(yyyy-mm-dd HH:MM:ss.l).yellow :mode.magenta :label [WORKER ID: ${process.env.CHILD_ID}, PID: ${process.pid}]`,
	tokens: {
		mode () { return `[${runningMode}]`; }
	}
});

const { processSingleFileStructure } = require("./single-file-structure-processor");
const { processMultiFileStructure } = require("./multi-files-structure-processor");

process.on("message", message => {
	if (!message.filename)
		return console.info("Received message:", message);

	if (!message.singleFileMode) {
		runningMode = ProcessingModes.MULTI_FILES;
		processMultiFileStructure(message.filename);
	} else {
		runningMode = ProcessingModes.SINGLE_FILE;
		processSingleFileStructure(message.filename, message.coordinates, message.start, message.end);
	}
});

console.log("Worker started.");
process.send({ started: true });
