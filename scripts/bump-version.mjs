import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const VERSION_FILE = resolve('version.json')
const OUTPUT_TS_FILE = resolve('src/version.ts')
const SW_FILE = resolve('public/sw.js')

function readVersionFile() {
    if (!existsSync(VERSION_FILE)) {
        return { version: '0.0.0' }
    }
    try {
        const raw = readFileSync(VERSION_FILE, 'utf-8')
        return JSON.parse(raw)
    } catch (error) {
        console.warn('[bump-version] 无法解析 version.json，使用默认版本 0.0.0。', error)
        return { version: '0.0.0' }
    }
}

function incrementPatch(version) {
    const parts = version.split('.').map((segment) => Number.parseInt(segment, 10))
    while (parts.length < 3) {
        parts.push(0)
    }
    const [major, minor, patch] = parts
    const nextPatch = Number.isFinite(patch) ? patch + 1 : 1
    return `${Number.isFinite(major) ? major : 0}.${Number.isFinite(minor) ? minor : 0}.${nextPatch}`
}

function main() {
    const now = new Date().toISOString()
    const versionData = readVersionFile()
    const currentVersion = typeof versionData.version === 'string' ? versionData.version : '0.0.0'
    const nextVersion = incrementPatch(currentVersion)

    const updatedData = {
        ...versionData,
        version: nextVersion,
        lastBuildAt: now,
    }

    writeFileSync(VERSION_FILE, `${JSON.stringify(updatedData, null, 2)}\n`, 'utf-8')

    const tsContent = `export const APP_VERSION = '${nextVersion}'\nexport const APP_BUILD_TIME = '${now}'\n`
    writeFileSync(OUTPUT_TS_FILE, tsContent, 'utf-8')

    updateServiceWorkerCacheName(nextVersion)

    console.log(`[bump-version] 版本号已更新: ${currentVersion} -> ${nextVersion}`)
    console.log(`[bump-version] 构建时间: ${now}`)
    console.log(`[bump-version] Service Worker 缓存名同步完成`)
}

function updateServiceWorkerCacheName(version) {
    try {
        const swContent = readFileSync(SW_FILE, 'utf-8')
        const updated = swContent.replace(
            /const CACHE_NAME = 'langger-cache-[^']*'/,
            `const CACHE_NAME = 'langger-cache-${version}'`
        )
        if (swContent !== updated) {
            writeFileSync(SW_FILE, updated, 'utf-8')
        } else {
            console.warn('[bump-version] 未能在 sw.js 中找到 CACHE_NAME 字段，请检查文件结构。')
        }
    } catch (error) {
        console.warn('[bump-version] 更新 Service Worker 缓存名失败:', error)
    }
}

main()

