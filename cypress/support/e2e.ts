// ***********************************************************
// 这个文件是 Cypress E2E 测试的支持文件
// 了解更多: https://on.cypress.io/configuration
// ***********************************************************

// 导入命令
// 示例: import './commands'

// 设置全局配置
Cypress.on("uncaught:exception", (err, runnable) => {
  // 返回 false 来阻止 Cypress 在未捕获的异常时失败
  // 这对于处理第三方库的错误很有用
  if (err.message.includes("ResizeObserver loop limit exceeded")) {
    return false;
  }
  // 其他异常继续抛出
  return true;
});

// 设置默认超时时间
Cypress.config("defaultCommandTimeout", 10000);

// 设置请求超时时间
Cypress.config("requestTimeout", 10000);

// 设置响应超时时间
Cypress.config("responseTimeout", 30000);

