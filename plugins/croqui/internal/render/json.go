package render

import (
	"encoding/json"

	"github.com/rclr-labs/croqui/internal/modelo"
)

// envelope leva o cabecalho de ameaca tambem no JSON: o consumidor de
// pipeline precisa da mesma declaracao que o leitor do .md.
type envelope struct {
	Gerador   string         `json:"gerador"`
	Versao    string         `json:"versao"`
	Data      string         `json:"data"`
	Nivel     int            `json:"nivel"`
	Anonimo   bool           `json:"anonimo"`
	Contem    string         `json:"contem"`
	NaoContem string         `json:"nao_contem"`
	GrafoNota string         `json:"grafo_nota"`
	Croqui    *modelo.Croqui `json:"croqui"`
}

func JSON(c *modelo.Croqui, o Opcoes) (string, error) {
	e := envelope{
		Gerador:   "croqui",
		Versao:    o.Versao,
		Data:      o.Data,
		Nivel:     o.nivel(),
		Anonimo:   o.Anonimo,
		Contem:    "nomes de classe, rota, tabela, job e comando; contagens; relacoes derivadas de convencao",
		NaoContem: "valor de configuracao, segredo, credencial, conteudo de .env, literal de codigo, linha de codigo-fonte",
		GrafoNota: "derivado de convencao e de import, em nivel de modulo; nao e call graph",
		Croqui:    c,
	}
	b, err := json.MarshalIndent(e, "", "  ")
	if err != nil {
		return "", err
	}
	return string(b) + "\n", nil
}
