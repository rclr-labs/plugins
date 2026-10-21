<?php

// Valor sensivel em posicao NAO-declarativa: nenhuma regra de extracao
// aponta para literal de string, entao ele nao alcanca o pacote.
return [
    'acme' => ['token' => env('ACME_API_TOKEN')],
];
