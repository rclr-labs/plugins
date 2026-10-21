<?php

namespace App\Models;

class Cliente extends Model
{
    protected $table = 'clientes';
    protected $fillable = ['razao', 'contato'];
}
