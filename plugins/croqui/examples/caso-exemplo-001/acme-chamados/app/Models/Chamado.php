<?php

namespace App\Models;

class Chamado extends Model
{
    protected $table = 'chamados';
    protected $fillable = ['cliente_id', 'titulo', 'prioridade', 'aberto_em'];
}
