# 通告功能使用说明（发布者版）

## 概述

通告功能允许发布者通过配置文件控制应用启动时的通告弹出行为。配置由发布者在发布前设置，最终用户无法修改。

## 使用流程

### 1. 打开配置工具

在浏览器中打开 `public/announcements/config.html` 文件（可以直接双击打开，或在浏览器中打开）。

### 2. 配置通告参数

在配置工具页面中设置以下参数：

- **启用通告功能**：勾选以启用，取消勾选以禁用
- **通告文件名**：要显示的通告 HTML 文件名（默认：`announcement.html`）
- **弹出策略**：选择以下三种策略之一
  - **当天仅弹出一次**：每天第一次打开应用时弹出
  - **每次打开程序弹出一次**：每次新标签页/新会话时弹出
  - **间隔 XX 分钟弹出一次**：根据设置的间隔时间弹出
- **间隔时间**：当选择"间隔 XX 分钟弹出一次"时，设置间隔时间（分钟）

### 3. 生成配置文件

点击"生成配置文件"按钮，会下载一个 `config.json` 文件。

### 4. 保存配置文件

将下载的 `config.json` 文件保存到 `public/announcements/` 目录下。

### 5. 构建和发布

重新构建应用并发布。应用启动时会自动读取 `config.json` 文件并应用配置。

## 配置文件格式

`config.json` 文件格式如下：

```json
{
  "filename": "announcement.html",
  "strategy": "once_per_day",
  "intervalMinutes": 60,
  "enabled": true
}
```

### 字段说明

- `filename` (string, 必需): 通告 HTML 文件名，位于 `public/announcements/` 目录下
- `strategy` (string, 必需): 弹出策略，可选值：
  - `"once_per_day"`: 当天仅弹出一次
  - `"every_launch"`: 每次打开程序弹出一次
  - `"interval_minutes"`: 间隔 XX 分钟弹出一次
- `intervalMinutes` (number, 可选): 间隔时间（分钟），仅当 `strategy` 为 `"interval_minutes"` 时有效，默认 60
- `enabled` (boolean, 可选): 是否启用通告功能，默认 `true`

## 加载现有配置

如果需要修改现有配置：

1. 点击"加载现有配置"按钮
2. 选择现有的 `config.json` 文件
3. 修改配置后重新生成并保存

## 弹出策略详解

### 1. 当天仅弹出一次 (`once_per_day`)

- **行为**：每天第一次打开应用时弹出，同一天内不会重复弹出
- **适用场景**：每日公告、每日提醒、每日任务等
- **实现原理**：使用日期字符串（YYYY-MM-DD）判断

### 2. 每次打开程序弹出一次 (`every_launch`)

- **行为**：每次打开应用（新标签页/新会话）时弹出，刷新页面不会重复弹出
- **适用场景**：重要通知、版本更新、活动推广等
- **实现原理**：使用 `sessionStorage` 判断，标签页关闭后自动清除

### 3. 间隔 XX 分钟弹出一次 (`interval_minutes`)

- **行为**：根据设置的间隔时间（分钟）弹出
- **适用场景**：定期提醒、活动推广、功能引导等
- **实现原理**：使用时间戳判断，距离上次弹出时间超过设定间隔时弹出

## 文件结构

```
public/announcements/
  ├── README.md              # 本说明文件
  ├── config.html            # 配置工具（发布者使用）
  ├── config.json            # 配置文件（由配置工具生成）
  └── announcement.html      # 通告内容文件（可自定义）
```

## 注意事项

1. **配置文件位置**：`config.json` 必须位于 `public/announcements/` 目录下
2. **文件编码**：配置文件必须使用 UTF-8 编码
3. **JSON 格式**：配置文件必须是有效的 JSON 格式
4. **构建时机**：修改配置后需要重新构建应用才能生效
5. **默认配置**：如果 `config.json` 不存在，将使用默认配置（当天仅弹出一次，启用）

## 故障排查

### 通告不显示

1. 检查 `config.json` 文件是否存在
2. 检查 `enabled` 字段是否为 `true`
3. 检查 `filename` 指定的 HTML 文件是否存在
4. 检查是否已经显示过（根据策略判断）
5. 查看浏览器控制台是否有错误信息

### 配置文件格式错误

1. 使用配置工具重新生成配置文件
2. 检查 JSON 格式是否正确（可以使用在线 JSON 验证工具）
3. 确保文件编码为 UTF-8

### 修改配置不生效

1. 确保配置文件已保存到正确位置
2. 重新构建应用
3. 清除浏览器缓存后重新加载

## 技术实现

- **配置读取**：应用启动时从 `public/announcements/config.json` 读取配置
- **存储机制**：使用 `localStorage` 和 `sessionStorage` 记录弹出历史
- **错误处理**：配置文件不存在或格式错误时，使用默认配置，不影响应用正常使用

## 示例场景

### 场景 1：每日学习提醒

```json
{
  "filename": "daily-reminder.html",
  "strategy": "once_per_day",
  "enabled": true
}
```

### 场景 2：版本更新通知

```json
{
  "filename": "update-notice.html",
  "strategy": "every_launch",
  "enabled": true
}
```

### 场景 3：活动推广（每小时提醒）

```json
{
  "filename": "promotion.html",
  "strategy": "interval_minutes",
  "intervalMinutes": 60,
  "enabled": true
}
```
