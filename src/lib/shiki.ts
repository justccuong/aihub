import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { type ShikiTransformer } from 'shiki/core'

// Themes
import githubLight from 'shiki/themes/github-light.mjs'
import githubDark from 'shiki/themes/github-dark.mjs'

// Languages
import typescript from 'shiki/langs/typescript.mjs'

let highlighterPromise: ReturnType<typeof createHighlighterCore> | null = null

export const getHighlighter = async () => {
    if (!highlighterPromise) {
        highlighterPromise = createHighlighterCore({
            themes: [githubLight, githubDark],
            langs: [typescript],
            engine: createJavaScriptRegexEngine(),
        })
    }
    return highlighterPromise
}

export type { ShikiTransformer }
