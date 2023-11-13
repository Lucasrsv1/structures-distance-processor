/**
 * Dados de controle do processamento de estruturas
 */
class CIFProcessingData {
	constructor () {
		/**
		 * @type {string | null} Nome do arquivo comprimido da estrutura
		 */
		this.filename = null;

		/**
		 * @type {number | null} Resultado da menor distância entre os átomos da estrutura até o momento
		 */
		this.min = null;

		/**
		 * @type {Date | null} Data de início do processamento da estrutura
		 */
		this.start = null;

		/**
		 * @type {number | null} Quantidade de workers cujo resultado do processamento ainda está pendente
		 */
		this.pending = null;

		/**
		 * @type {number | null} Índice do próximo modelo da estrutura que será processado
		 */
		this.nextModel = null;

		/**
		 * @type {number[][][] | null} Coordenadas dos átomos de cada modelo da estrutura
		 */
		this.coordinates = null;

		/**
		 * @type {boolean | null} Indica se ocorreu erro durante o processamento da estrutura
		 */
		this.failed = false;

		/**
		 * @type {boolean | null} Indica se o processamento da estrutura foi finalizado
		 */
		this.done = true;
	}

	/**
	 * Inicializa os dados de controle do processamento para uma estrutura
	 * @param {string} filename Nome do arquivo comprimido da estrutura
	 */
	initiate (filename) {
		this.filename = filename;
		this.min = Infinity;
		this.start = Date.now();
		this.pending = null;
		this.nextModel = 0;
		this.coordinates = null;
		this.failed = false;
		this.done = false;
	}

	/**
	 * Reinicia os dados de controle do processamento de estruturas
	 */
	reset () {
		this.filename = null;
		this.min = null;
		this.start = null;
		this.pending = null;
		this.nextModel = null;
		this.coordinates = null;
		this.failed = false;
		this.done = true;
	}
}

module.exports = { CIFProcessingData };
