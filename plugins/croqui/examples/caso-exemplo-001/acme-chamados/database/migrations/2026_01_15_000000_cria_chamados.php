<?php

Schema::create('chamados', function (Blueprint $table) {
    $table->id();
    $table->foreignId('cliente_id')->constrained();
    $table->string('titulo');
    $table->timestamps();
});
