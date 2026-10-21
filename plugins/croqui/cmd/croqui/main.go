package main

import (
	"fmt"
	"os"

	"github.com/rclr-labs/croqui"
)

func main() {
	fmt.Printf("croqui %s\n", croqui.Versao)
	os.Exit(0)
}
