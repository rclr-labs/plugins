package modelo

// Categorias sao CONSTANTES, nunca construidas a partir de entrada. Se
// fossem `string` crua preenchida pelo extrator, seriam campo de texto livre
// e abririam exatamente o buraco que este pacote fecha.
type Camada string

const (
	CamadaLaravel  Camada = "laravel"
	CamadaNodeTS   Camada = "nodets"
	CamadaGenerico Camada = "generico"
)

type TipoEntrada string

const (
	EntradaHTTP TipoEntrada = "http"
	EntradaCLI  TipoEntrada = "cli"
	EntradaFila TipoEntrada = "fila"
)

type TipoAresta string

const (
	ArestaRotaControlador     TipoAresta = "rota->controlador"
	ArestaControladorEntidade TipoAresta = "controlador->entidade"
	ArestaEntidadeTabela      TipoAresta = "entidade->tabela"
	ArestaImport              TipoAresta = "import"
)

// Croqui e a IR completa. Todo campo e de tipo fechado ou de categoria
// constante. Nenhum campo e `string` cru.
type Croqui struct {
	Nome          Seg        `json:"nome"`
	Camadas       []Camada   `json:"camadas"`
	Stacks        []Stack    `json:"stacks"`
	Entradas      []Entrada  `json:"entradas"`
	Rotas         []RotaDecl `json:"rotas"`
	Controladores []Ident    `json:"controladores"`
	Entidades     []Entidade `json:"entidades"`
	Jobs          []Ident    `json:"jobs"`
	Comandos      []Ident    `json:"comandos"`
	Eventos       []Ident    `json:"eventos"`
	Pastas        []Pasta    `json:"pastas"`
	Arestas       []Aresta   `json:"arestas"`
	Recusados     []Seg      `json:"recusados"`
	Symlinks      int        `json:"symlinks_ignorados"`
	Truncado      bool       `json:"truncado"`
}

type Stack struct {
	Nome   Seg `json:"nome"`
	Versao Seg `json:"versao,omitempty"`
}

type Entrada struct {
	Tipo TipoEntrada `json:"tipo"`
	Alvo []Seg       `json:"alvo"`
}

type RotaDecl struct {
	Verbo       Verbo `json:"verbo"`
	Caminho     Rota  `json:"caminho"`
	Controlador Ident `json:"controlador,omitempty"`
	Metodo      Ident `json:"metodo,omitempty"`
}

type Entidade struct {
	Classe Ident   `json:"classe"`
	Tabela Tabela  `json:"tabela,omitempty"`
	Campos []Ident `json:"campos,omitempty"`
}

type Pasta struct {
	Caminho  []Seg       `json:"caminho"`
	Arquivos int         `json:"arquivos"`
	Exts     map[Seg]int `json:"exts,omitempty"`
}

type Aresta struct {
	De   Ident      `json:"de"`
	Para Ident      `json:"para"`
	Tipo TipoAresta `json:"tipo"`
}
