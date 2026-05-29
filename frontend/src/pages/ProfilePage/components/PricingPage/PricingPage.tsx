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

const PLAN_PRICES_MINOR: Record<PlanSlug, Record<Currency, number>> = {
    standard: { USD: 399, CAD: 499, EUR: 399 },
    pro:      { USD: 999, CAD: 1399, EUR: 999 },
}

const PLAN_TIER: Record<string, number> = { free: 0, standard: 1, pro: 2 }

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

    const standardName = t("profile.planNameStandard", "Standard")
    const proName = t("profile.planNamePro", "Pro")

    const getCtaLabel = (cardSlug: PlanSlug, cardName: string) => {
        if (!currentPlanSlug) return t("profile.getPlan", { name: cardName, defaultValue: `Get ${cardName}` })
        if (currentPlanSlug === cardSlug) return t("profile.currentPlan", "Current Plan")
        return PLAN_TIER[cardSlug] > (PLAN_TIER[currentPlanSlug] ?? 0)
            ? t("profile.upgradeTo", { name: cardName, defaultValue: `Upgrade to ${cardName}` })
            : t("profile.downgradeTo", { name: cardName, defaultValue: `Downgrade to ${cardName}` })
    }

    const standard_plan: PointDescription[] = [
        {amount: 300, desc: t("profile.featureSummaries")},
        {amount: 5, desc: t("profile.featureSessionSlots")},
        {amount: 30000, desc: t("profile.featureCharsPerInput")},
        {amount: null, desc: t("profile.featureWorksOn")}
    ]

    const pro_plan: PointDescription[] = [
        {amount: 1200, desc: t("profile.featureSummaries")},
        {amount: 10, desc: t("profile.featureSessionSlots")},
        {amount: t("profile.unlimited", "Unlimited"), desc: t("profile.featureCharsPerInput")},
        {amount: null, desc: t("profile.featureWorksOn")}
    ]

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
                <span className="return-text">{t("profile.returnButton")}</span>
            </button>
            <div className="pricingpage">
                <PricingPageCard
                    plan_name={standardName}
                    plan_desc={t("profile.standardDesc")}
                    price={standardPrice}
                    pointsList={standard_plan}
                    ctaLabel={getCtaLabel("standard", standardName)}
                    disabled={currentPlanSlug === "standard"}
                    loading={loadingSlug === "standard"}
                    onClick={() => handleUpgrade("standard")}
                />
                <PricingPageCard
                    plan_name={proName}
                    plan_desc={t("profile.proDesc")}
                    price={proPrice}
                    pointsList={pro_plan}
                    ctaLabel={getCtaLabel("pro", proName)}
                    disabled={currentPlanSlug === "pro"}
                    loading={loadingSlug === "pro"}
                    onClick={() => handleUpgrade("pro")}
                />
            </div>
            {errorMessage && <p className="pricingpage-error" role="alert">{errorMessage}</p>}
        </div>
    )
}
