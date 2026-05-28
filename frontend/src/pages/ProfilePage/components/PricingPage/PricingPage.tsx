import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useSettingsStore } from "../../../../stores/settingsStore"
import { deriveSubscriptionPrice } from "../../profilepage.helpers"
import { PricingPageCard } from "./PricingPageCard"
import "./PricingPage.css"
import { PointDescription } from "./PricingPageCard"
import { ArrowLeftIcon } from "@radix-ui/react-icons"
import { Currency } from "../../../../utils/types"
import { authInstance } from "../../../../services/axiosService"
import { parseApiErrorMessage } from "../../../../utils/apiError"

type PlanSlug = "standard" | "pro"

const standard_plan: PointDescription[] = [
    {amount: 300, desc: "Summaries, Flashcards, Quizzes"},
    {amount: 5, desc: "Saved session slots"},
    {amount: 30000, desc: "Characters per input"},
    {amount: null, desc: "Works on Webpages, PDFs, YouTube Transcripts"}
]

const pro_plan: PointDescription[] = [
    {amount: 1200, desc: "Summaries, Flashcards, Quizzes"},
    {amount: 10, desc: "Saved session slots"},
    {amount: "Unlimited", desc: "Characters per input"},
    {amount: null, desc: "Works on Webpages, PDFs, YouTube Transcripts"}
]

const PLAN_PRICES_MINOR: Record<PlanSlug, Record<Currency, number>> = {
    standard: { USD: 399, CAD: 499, EUR: 399 },
    pro:      { USD: 999, CAD: 1399, EUR: 999 },
}

const PLAN_TIER: Record<string, number> = { free: 0, standard: 1, pro: 2 }

const getCtaLabel = (cardSlug: PlanSlug, cardName: string, currentSlug?: string) => {
    if (!currentSlug) return `Get ${cardName}`
    if (currentSlug === cardSlug) return "Current Plan"
    return PLAN_TIER[cardSlug] > (PLAN_TIER[currentSlug] ?? 0)
        ? `Upgrade to ${cardName}`
        : `Downgrade to ${cardName}`
}

interface PricingPageProps {
    currentPlanSlug?: string;
    onClickReturn: () => void;
}

export const PricingPage = ({ currentPlanSlug, onClickReturn }: PricingPageProps) => {
    const { t } = useTranslation()
    const currency = useSettingsStore((s) => s.currency)

    const [loadingSlug, setLoadingSlug] = useState<PlanSlug | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const standardPrice = deriveSubscriptionPrice(PLAN_PRICES_MINOR.standard[currency], currency, t)
    const proPrice = deriveSubscriptionPrice(PLAN_PRICES_MINOR.pro[currency], currency, t)

    const handleUpgrade = async (plan_slug: PlanSlug) => {
        setErrorMessage(null)
        setLoadingSlug(plan_slug)
        try {
            const { data } = await authInstance.post<{ url: string }>(
                "/api/billing/checkout-session",
                { plan_slug, currency },
            )
            // Use chrome.tabs.create when running as an extension. Opening from
            // the extension popup via window.open would close the popup as
            // focus shifts, leaving the new tab stuck on about:blank.
            const chromeApi = globalThis.chrome
            if (chromeApi?.tabs?.create) {
                chromeApi.tabs.create({ url: data.url })
            } else {
                window.location.href = data.url
            }
        } catch (error) {
            setErrorMessage(parseApiErrorMessage(error))
        } finally {
            setLoadingSlug(null)
        }
    }

    return (
        <div>
            <button className="return-btn" onClick={onClickReturn}>
                <ArrowLeftIcon width={14} height={14}/>
                <span className="return-text">Return</span>
            </button>
            <div className="pricingpage">
                <PricingPageCard
                    plan_name="Standard"
                    plan_desc="For casual users."
                    price={standardPrice}
                    pointsList={standard_plan}
                    ctaLabel={getCtaLabel("standard", "Standard", currentPlanSlug)}
                    disabled={currentPlanSlug === "standard"}
                    loading={loadingSlug === "standard"}
                    onClick={() => handleUpgrade("standard")}
                />
                <PricingPageCard
                    plan_name="Pro"
                    plan_desc="For heavy users."
                    price={proPrice}
                    pointsList={pro_plan}
                    ctaLabel={getCtaLabel("pro", "Pro", currentPlanSlug)}
                    disabled={currentPlanSlug === "pro"}
                    loading={loadingSlug === "pro"}
                    onClick={() => handleUpgrade("pro")}
                />
            </div>
            {errorMessage && <p className="pricingpage-error" role="alert">{errorMessage}</p>}
        </div>
    )
}
