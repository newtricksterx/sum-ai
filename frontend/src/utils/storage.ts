import { Currency, Format, Language, Length, Theme } from "./types"
import { normalizeSummaryActionItems, type SummaryActionItem } from "../types/summary"

const SUMMARY_STORAGE_KEY = "summary"
const SUMMARY_STORAGE_FALLBACK = `Please Click the ${"Generate summary"} button`

type SummaryStoragePayload = {
    html: string
    sourceUrl: string | null
    actionItems: SummaryActionItem[]
    isSuccess: boolean
}

const buildSummaryPayload = (
    html: string,
    sourceUrl?: string | null,
    actionItems: SummaryActionItem[] = [],
    isSuccess = false,
): SummaryStoragePayload => {
    return {
        html,
        sourceUrl: sourceUrl ?? null,
        actionItems,
        isSuccess,
    }
}

const parseSummaryPayload = (storedSummary: string): SummaryStoragePayload => {
    try {
        const parsedValue = JSON.parse(storedSummary) as unknown

        if (parsedValue && typeof parsedValue === "object") {
            const candidate = parsedValue as Partial<SummaryStoragePayload>
            if (typeof candidate.html === "string") {
                return {
                    html: candidate.html,
                    sourceUrl: typeof candidate.sourceUrl === "string" ? candidate.sourceUrl : null,
                    actionItems: normalizeSummaryActionItems(candidate.actionItems),
                    isSuccess: candidate.isSuccess === true,
                }
            }
        }
    } catch {
        // Backward compatibility for older plain-HTML summary strings.
    }

    return {
        html: storedSummary,
        sourceUrl: null,
        actionItems: [],
        isSuccess: false,
    }
}

export const UpdateLanguageStorage = (currentLang: Language) => {
    localStorage.setItem('language', currentLang)
}

export const UpdateLengthStorage = (currentLength: Length) => {
    localStorage.setItem('length', currentLength)
}

export const UpdateCurrencyStorage = (currentCurrency: Currency) => {
    localStorage.setItem('currency', currentCurrency)
}

export const UpdateFontSizeStorage = (currentFontSize: number) => {
    localStorage.setItem('fontSize', currentFontSize.toString())
}

export const UpdateThemeStorage = (currentTheme: Theme) => {
    localStorage.setItem('theme', currentTheme)
}

export const UpdateSummaryStorage = (
    currentSummary: string,
    sourceUrl?: string | null,
    actionItems: SummaryActionItem[] = [],
    isSuccess = false,
) => {
    localStorage.setItem(
        SUMMARY_STORAGE_KEY,
        JSON.stringify(buildSummaryPayload(currentSummary, sourceUrl, actionItems, isSuccess)),
    )
}

export const UpdateFormatStorage = (currentFormat: Format) => {
    localStorage.setItem('format', currentFormat)
}

export const UpdatePageStorage = (currentPage: number) => {
    localStorage.setItem('page', currentPage.toString());
}

export const GetLangFromStorage = () => {
    return localStorage && localStorage.getItem('language') ? localStorage.getItem('language') as Language : "english"
}

export const GetLengthFromStorage = () => {
    return localStorage && localStorage.getItem('length') ? localStorage.getItem('length') as Length : null
}

export const GetCurrencyFromStorage = () => {
    return localStorage && localStorage.getItem('currency') ? localStorage.getItem('currency') as Currency : null
}

export const GetFontSizeFromStorage = () => {
    return localStorage && localStorage.getItem('fontSize') ? Number(localStorage.getItem('fontSize')) : null
}

export const GetThemeFromStorage = () => {
    return localStorage && localStorage.getItem('theme') ? localStorage.getItem('theme') as Theme : null
}

export const GetSummaryFromStorage = () => {
    const storedSummary = localStorage && localStorage.getItem(SUMMARY_STORAGE_KEY)

    if (!storedSummary) {
        return SUMMARY_STORAGE_FALLBACK
    }

    return parseSummaryPayload(storedSummary).html
}

export const GetSummaryPayloadFromStorage = (): SummaryStoragePayload => {
    const storedSummary = localStorage && localStorage.getItem(SUMMARY_STORAGE_KEY)

    if (!storedSummary) {
        return buildSummaryPayload(SUMMARY_STORAGE_FALLBACK, null, [], false)
    }

    return parseSummaryPayload(storedSummary)
}

export const GetFormatFromStorage = () => {
    return localStorage && localStorage.getItem('format') ? localStorage.getItem('format') as Format : null
}

export const GetPageFromStorage = () => {
    return localStorage && localStorage.getItem('page') ? Number(localStorage.getItem('page')) : null
}
