# Processador de Estruturas

## Instalação de Dependências

1. Garanta que a versão `18` do Node.js estará instalada e em uso no seu computador para executar este software.

2. Execute o comando `npm i` dentro da pasta raiz do projeto.

	**Observação:** esta aplicação foi testada no **Ubuntu 22.04.1 LTS** usando as seguintes versões dos softwares necessários:

	- **Node.js v18.17.1**

	- **npm 9.6.7**

	- **npx 9.6.7**

## Iniciar Aplicação

Na raiz do projeto execute um dos seguintes comandos para iniciar o processamento de estruturas:

```sh
node index.js
```
ou
```sh
npm start
```

**Observação:** o comando `npm start` utiliza o `nodemon` e deve ser usado apenas em desenvolvimento.

## Deploy em Produção

Em ambiente de produção deve-se utilizar o [**pm2**](https://pm2.keymetrics.io/). Para isso, execute os seguintes passos:

1. Configure a chave `NODE_ENV` no arquivo de variáveis de ambiente (`.env`) para definir o ambiente como sendo de produção de acordo com o valor abaixo:

	```sh
	NODE_ENV = production
	```

2. Caso ainda não tenha instalado o [**pm2-logrotate**](https://github.com/keymetrics/pm2-logrotate), instale-o usando o seguinte comando:

	```sh
	pm2 install pm2-logrotate
	```

	O objetivo deste plugin do pm2 é limitar o uso de disco para armazenar os logs da aplicação, limitando o espaço de armazenamento usado e rotacionando os logs da aplicação quando o limite de uso do disco é alcançado.

3. Instale o serviço do processador de estruturas usando o seguinte comando:

	```sh
	pm2 start --name "Structures Distance Processor" index.js
	```

4. Verifique a lista de serviços do pm2 usando o comando `pm2 ls` e confirme que tudo está funcionando. Logs podem ser acessados usando o comando `pm2 log` ou acessando os arquivos de log diretamente na pasta `/home/ubuntu/.pm2/logs`.

6. Por fim, salve a lista de serviços em execução através do comando `pm2 save` e configure o pm2 para executar estes serviços quando o computador for inicializado por meio do comando `pm2 startup`. Este último comando provavelmente irá gerar e imprimir um comando para você **copiar**, **colar** e **executar** em seu terminal para de fato configurar a execução dos serviços quando o computador for ligado.
