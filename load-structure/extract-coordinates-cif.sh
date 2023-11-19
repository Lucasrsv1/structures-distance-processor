#!/bin/bash

# Extrai arquivo comprimido com os átomos
gzip -dfk "$1"
decompressed_file=${1%.*}

# Encontra o número da linha onde está o cabeçalho do número do modelo
model_header_line=`awk '$1 ~ /^_atom_site.pdbx_PDB_model_num ?$/ { print NR }' "$decompressed_file"`

# Encontra o número da linha onde está o cabeçalho da flag de posição alternativa
alt_pos_header_line=`awk '$1 ~ /^_atom_site.label_alt_id ?$/ { print NR }' "$decompressed_file"`

# Encontra o número da linha onde está o cabeçalho da coluna da coordenada X
x_header_line=`awk '$1 ~ /^_atom_site.Cartn_x ?$/ { print NR }' "$decompressed_file"`

# Lendo o arquivo de baixo pra cima a partir da linha onde está o cabeçalho da coordenada X,
# encontra a linha onde se inicia o loop dentre as 25 linhas anteriores.
# Subtraindo 1 desse resultado temos o número correto da coluna com a coordenada X dos átomos.
x_col=$((`head -n $x_header_line "$decompressed_file" | tail -n 40 | tac | awk '$1 ~ /^loop_/ { print NR }' | head -n 1` - 1))

y_col=$(($x_col + 1))
z_col=$(($x_col + 2))

model_col=$((`head -n $model_header_line "$decompressed_file" | tail -n 40 | tac | awk '$1 ~ /^loop_/ { print NR }' | head -n 1` - 1))
alt_pos_col=$((`head -n $alt_pos_header_line "$decompressed_file" | tail -n 40 | tac | awk '$1 ~ /^loop_/ { print NR }' | head -n 1` - 1))

# Imprime apenas as colunas das coordenadas X, Y e Z apenas para as linhas que possuem átomos
echo "EXTRACTED COORDINATES"
awk -v x_col="$x_col" -v y_col="$y_col" -v z_col="$z_col" -v model_col="$model_col" -v alt_pos_col="$alt_pos_col" '
	$1 ~ /^(ATOM|HETATM)/ {
		if (prev != $model_col) {
			original_pos_marker = "";
			print "MODEL";
		}

		if ($alt_pos_col == " " || $alt_pos_col == ".") {
			alt_pos = 0;
			original_pos_marker = "";
		} else {
			if (original_pos_marker != "" && original_pos_marker != $alt_pos_col) {
				alt_pos = 1;
			} else {
				alt_pos = 0;
				original_pos_marker = $alt_pos_col;
			}
		}

		print $x_col, $y_col, $z_col, alt_pos;
	}

	{
		prev = $model_col;
	}' "$decompressed_file"

# * Referência: https://www.ccdc.cam.ac.uk/community/access-deposit-structures/deposit-a-structure/guide-to-cifs/#cif-format
