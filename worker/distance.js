/**
 * Calcula a distância entre dois átomos
 * @param {number[]} atomA Coordenadas de um átomo
 * @param {number[]} atomB Coordenadas do segundo átomo
 * @returns {number} Distância entre os átomos
 */
function calculateDistance (atomA, atomB) {
	return Math.sqrt(
		Math.pow(atomA[0] - atomB[0], 2) +
		Math.pow(atomA[1] - atomB[1], 2) +
		Math.pow(atomA[2] - atomB[2], 2)
	);
}

/**
 * Calcula a menor distância entre átomos para uma determinada faixa da estrutura
 * @param {number[][]} coordinates Coordenadas dos átomos da estrutura
 * @param {number} from Índice do primeiro átomo a ser avaliado
 * @param {number} to Índice do último átomo a ser avaliado
 * @returns {number} Menor distância encontrada
 */
function calculateMinDistance (coordinates, from, to) {
	let min = Infinity;
	for (let i = from; i <= to; i++) {
		let altPosFlag = true;
		for (let j = i + 1; j < coordinates.length; j++) {
			// Se ainda não encontrou um átomo diferente, e a próxima coordenada é apenas uma
			// posição alternativa do átomo atual, ignora e continua
			if (altPosFlag && coordinates[j][3] !== 0)
				continue;

			altPosFlag = false;
			const distance = calculateDistance(coordinates[i], coordinates[j]);

			// Ignora distância igual a zero, pois a resolução do modelo não foi suficiente para distinguir a posição entre esses dois átomos
			// * Um exemplo de ocorrência pode ser encontrada na estrutura 16pk (linhas 1101 e 1103 do PDB), coordenada "6.554  45.018  23.309"
			if (distance > 0)
				min = Math.min(min, distance);
		}
	}

	return min;
}

module.exports = { calculateMinDistance };
