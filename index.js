// Configura variáveis de ambiente o mais cedo possível
require("dotenv").config();

// Configura estampa de tempo dos logs
require("console-stamp")(console, { format: ":date(yyyy-mm-dd HH:MM:ss.l).yellow :label" });

const cifProcessor = require("./cif-processor");
const genericProcessor = require("./generic-processor");

if (process.env.CIF_ONLY === "true")
	cifProcessor.start();
else
	genericProcessor.start();
