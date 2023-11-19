const { getNextStructures } = require("./structures-getter");
const { sendDistanceResult } = require("./distance-result-sender");
const { ProcessingModes } = require("./processing-modes");

const MAXIMUM_PER_MACHINE = 20;

function onMessageFromWorker (message) {
	delete global.filenames[message.filename];

	if (!message.failure) {
		sendDistanceResult(message.result, message.processingTime, message.filename);
		console.log("Got results from child ID", message.childId);
	} else {
		console.error("Got failure from child ID", message.childId);
	}
}

/**
 * Função de execução da lógica de processamento de múltiplas estruturas ao mesmo tempo
 */
async function run (CHILDREN) {
	try {
		const qtyBusyChildren = CHILDREN.filter(c => c.isBusy).length;
		if (qtyBusyChildren > 0)
			console.log(`Still processing structures, ${qtyBusyChildren} remaining...`);

		const availableCPUs = CHILDREN.filter(c => c.isReady && !c.singleFileLock && !c.isBusy).length;
		if (availableCPUs > 0) {
			const filenames = await getNextStructures(Math.min(MAXIMUM_PER_MACHINE, availableCPUs), ProcessingModes.MULTI_FILES);
			for (let i = 0; i < filenames.length; i++) {
				const freeChild = CHILDREN.find(c => c.isReady && !c.isBusy);

				// Se não tem filhos livres, cancela processamento das estruturas não enviadas a processos filhos
				// * O servidor irá automaticamente redistribuir as estruturas no futuro
				if (!freeChild) break;

				freeChild.child.send({ filename: filenames[i], multiFilesMode: true });
				freeChild.isBusy = true;
				freeChild.filename = filenames[i];
				freeChild.processingMode = ProcessingModes.MULTI_FILES;
				global.filenames[filenames[i]] = true;
			}
		}
	} catch (error) {
		console.error(error);
	}
}

module.exports = { run, onMessageFromWorker };
