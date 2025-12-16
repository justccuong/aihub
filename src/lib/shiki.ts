import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { type ShikiTransformer } from 'shiki/core'

// Themes
import oneLight from 'shiki/themes/one-light.mjs'
import oneDarkPro from 'shiki/themes/one-dark-pro.mjs'
import githubLight from 'shiki/themes/github-light.mjs'
import githubDark from 'shiki/themes/github-dark.mjs'

// Languages
import typescript from 'shiki/langs/typescript.mjs'
import javascript from 'shiki/langs/javascript.mjs'
import tsx from 'shiki/langs/tsx.mjs'
import jsx from 'shiki/langs/jsx.mjs'
import bash from 'shiki/langs/bash.mjs'
import json from 'shiki/langs/json.mjs'
import python from 'shiki/langs/python.mjs'
import markdown from 'shiki/langs/markdown.mjs'
import html from 'shiki/langs/html.mjs'
import css from 'shiki/langs/css.mjs'
import yaml from 'shiki/langs/yaml.mjs'
import sql from 'shiki/langs/sql.mjs'
import xml from 'shiki/langs/xml.mjs'

let highlighterPromise: ReturnType<typeof createHighlighterCore> | null = null

export const getHighlighter = async () => {
    if (!highlighterPromise) {
        highlighterPromise = createHighlighterCore({
            themes: [oneLight, oneDarkPro, githubLight, githubDark],
            langs: [typescript, javascript, tsx, jsx, bash, json, python, markdown, html, css, yaml, sql, xml],
            engine: createJavaScriptRegexEngine(),
        })
    }
    return highlighterPromise
}

export type { ShikiTransformer }
