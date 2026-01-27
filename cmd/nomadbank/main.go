package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/CoxxA/nomadbank/internal/config"
	"github.com/CoxxA/nomadbank/server"
	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/web"
)

var (
	version = "dev"
	commit  = "unknown"
)

func main() {
	// 命令行参数
	var (
		showVersion bool
		port        int
		dataDir     string
		mode        string
	)

	flag.BoolVar(&showVersion, "version", false, "显示版本信息")
	flag.IntVar(&port, "port", 0, "服务端口 (默认: 8080)")
	flag.StringVar(&dataDir, "data", "", "数据目录 (默认: ./data)")
	flag.StringVar(&mode, "mode", "", "运行模式: dev/prod (默认: dev)")
	flag.Parse()

	// 显示版本
	if showVersion {
		fmt.Printf("NomadBankKeeper %s (%s)\n", version, commit)
		os.Exit(0)
	}

	// 加载配置
	cfg := config.Load()

	// 命令行参数覆盖环境变量
	if port > 0 {
		cfg.Port = port
	}
	if dataDir != "" {
		cfg.DataDir = dataDir
	}
	if mode != "" {
		cfg.Mode = mode
	}

	// 初始化数据库
	db, err := store.NewDB(cfg.DBPath(), cfg.IsDev())
	if err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}

	// 创建 Store
	s := store.New(db)

	// 创建服务器
	srv := server.New(cfg, s)

	// 注册 API 路由
	srv.SetupRoutesWithVersion(version, commit)

	// 注册前端静态文件
	web.RegisterRoutes(srv.Echo())

	// 启动服务
	log.Printf("NomadBankKeeper 启动中...")
	log.Printf("数据目录: %s", cfg.DataDir)
	log.Printf("运行模式: %s", cfg.Mode)
	log.Printf("服务地址: http://localhost:%d", cfg.Port)

	if err := srv.Start(); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}
