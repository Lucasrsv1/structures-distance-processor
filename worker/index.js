// Configura variáveis de ambiente o mais cedo possível
require("dotenv").config();

// Configura estampa de tempo dos logs
require("console-stamp")(console, {
	format: `:date(yyyy-mm-dd HH:MM:ss.l).yellow :label [WORKER ID: ${process.env.CHILD_ID}, PID: ${process.pid}]`
});

const { processCIFStructure } = require("./cif-processor");
const { processStructure } = require("./structure-processor");

process.on("message", message => {
	if (!message.filename)
		return console.info("Received message:", message);

	if (!process.env.CIF_MODE)
		processStructure(message.filename);
	else
		processCIFStructure(message.filename, message.coordinates, message.start, message.end);
});

console.log("Worker started.");
process.send({ started: true });
