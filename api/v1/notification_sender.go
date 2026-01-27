package v1

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/CoxxA/nomadbank/store/model"
)

// notificationHTTPClient 共享 HTTP 客户端，用于发送通知请求
var notificationHTTPClient = &http.Client{
	Timeout: 10 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        10,
		MaxIdleConnsPerHost: 5,
		IdleConnTimeout:     30 * time.Second,
	},
}

// sendNotification 发送通知到指定渠道
func sendNotification(channel *model.NotificationChannel, message string) error {
	config := channel.GetConfig()

	switch channel.Type {
	case model.NotificationTypeBark:
		return sendBarkNotification(config, message)
	case model.NotificationTypeTelegram:
		return sendTelegramNotification(config, message)
	default:
		return fmt.Errorf("不支持的通知类型: %s", channel.Type)
	}
}

// sendBarkNotification 发送 Bark 通知
func sendBarkNotification(config map[string]interface{}, message string) error {
	deviceKey, ok := config["device_key"].(string)
	if !ok || deviceKey == "" {
		return fmt.Errorf("缺少 device_key 配置")
	}

	serverURL := "https://api.day.app"
	if customURL, ok := config["server_url"].(string); ok && customURL != "" {
		serverURL = strings.TrimSuffix(customURL, "/")
	}

	// 构建 Bark URL
	barkURL := fmt.Sprintf("%s/%s/%s/%s",
		serverURL,
		deviceKey,
		url.PathEscape("NomadBankKeeper"),
		url.PathEscape(message),
	)

	resp, err := notificationHTTPClient.Get(barkURL)
	if err != nil {
		return fmt.Errorf("发送 Bark 通知失败: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("bark 返回错误: %s", string(body))
	}

	return nil
}

// sendTelegramNotification 发送 Telegram 通知
func sendTelegramNotification(config map[string]interface{}, message string) error {
	botToken, ok := config["bot_token"].(string)
	if !ok || botToken == "" {
		return fmt.Errorf("缺少 bot_token 配置")
	}

	chatID, ok := config["chat_id"].(string)
	if !ok || chatID == "" {
		return fmt.Errorf("缺少 chat_id 配置")
	}

	// 构建 Telegram API URL
	telegramURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)

	// 构建请求体
	payload := map[string]string{
		"chat_id": chatID,
		"text":    message,
	}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("序列化请求失败: %v", err)
	}

	resp, err := notificationHTTPClient.Post(telegramURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("发送 Telegram 通知失败: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("telegram 返回错误: %s", string(body))
	}

	return nil
}
