<?php

use Illuminate\Support\Facades\Route;

Route::get('/chamados', [ChamadoController::class, 'index']);
Route::post('/chamados', [ChamadoController::class, 'store']);
Route::get('/chamados/{id}', [ChamadoController::class, 'show']);
Route::delete('/chamados/{id}', 'ChamadoController@destroy');
Route::get('/saude', function () {
    return response()->json(['ok' => true]);
});
