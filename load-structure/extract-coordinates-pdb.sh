#!/bin/bash

# Extrai arquivo comprimido com os átomos
gzip -dfk "$1"
decompressed_file=${1%.*}

# Imprime apenas as colunas das coordenadas X, Y e Z apenas para as linhas que possuem átomos
echo "EXTRACTED COORDINATES"
awk '
	$1 ~ /^MODEL/ {
		original_pos_marker = "";
		print "MODEL";
	}

	$1 ~ /^(ATOM|HETATM)/ {
		x = substr($0, 31, 8);
		y = substr($0, 39, 8);
		z = substr($0, 47, 8);

		alt_pos_char = substr($0, 17, 1);

		if (alt_pos_char == " " || alt_pos_char == ".") {
			alt_pos = 0;
			original_pos_marker = "";
		} else {
			if (original_pos_marker != "" && original_pos_marker != alt_pos_char) {
				alt_pos = 1;
			} else {
				alt_pos = 0;
				original_pos_marker = alt_pos_char;
			}
		}

		gsub(/ /, "", x);
		gsub(/ /, "", y);
		gsub(/ /, "", z);

		print x, y, z, alt_pos;
	}' "$decompressed_file"

# * Referência: https://www.cgl.ucsf.edu/chimera/docs/UsersGuide/tutorials/pdbintro.html
