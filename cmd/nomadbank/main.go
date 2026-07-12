package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	_ "time/tzdata"

	"github.com/CoxxA/nomadbank/v2/internal/config"
	"github.com/CoxxA/nomadbank/v2/internal/httpapi"
	"github.com/CoxxA/nomadbank/v2/internal/sqlite"
	"github.com/CoxxA/nomadbank/v2/web"
)

var (
	version = "dev"
	commit  = "unknown"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	var (
		showVersion bool
		port        int
		dataDir     string
	)
	flag.BoolVar(&showVersion, "version", false, "显示版本信息")
	flag.IntVar(&port, "port", 0, "HTTP 端口")
	flag.StringVar(&dataDir, "data", "", "数据目录")
	flag.Parse()

	if showVersion {
		fmt.Printf("NomadBank %s (%s)\n", version, commit)
		return nil
	}

	appConfig, err := config.Load()
	if err != nil {
		return err
	}
	if port != 0 {
		appConfig.Port = port
	}
	if dataDir != "" {
		appConfig.DataDir = dataDir
	}
	if err := appConfig.Validate(); err != nil {
		return err
	}

	store, err := sqlite.Open(appConfig.DBPath())
	if err != nil {
		return err
	}
	defer store.Close()

	server := httpapi.New(appConfig, store)
	web.RegisterRoutes(server.Echo())

	serverErrors := make(chan error, 1)
	go func() {
		log.Printf("NomadBank %s 启动于 http://localhost%s", version, appConfig.Address())
		serverErrors <- server.Start()
	}()

	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGINT, syscall.SIGTERM)
	defer signal.Stop(signals)

	select {
	case received := <-signals:
		log.Printf("收到信号 %s，正在停止服务", received)
	case err := <-serverErrors:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return server.Shutdown(ctx)
}
