import { PricingPageCard } from "./PricingPageCard"
import "./PricingPage.css"
import { PointDescription } from "./PricingPageCard"

const standard_plan: PointDescription[] = [
    {amount: 300, desc: "Summaries, Flashcards, Quizzes"},
    {amount: 5, desc: "Saved session slots"},
    {amount: 30000, desc: "Characters per input"},
    {amount: null, desc: "Works on Webpages, PDFs, Youtube Transcripts"}
] 

const pro_plan: PointDescription[] = [
    {amount: 1200, desc: "Summaries, Flashcards, Quizzes"},
    {amount: 10, desc: "Saved session slots"},
    {amount: "Unlimited", desc: "Characters per input"},
    {amount: null, desc: "Works on Webpages, PDFs, Youtube Transcripts"}
] 

export const PricingPage = () => {
    return (
        <div className="pricingpage">
            <PricingPageCard plan_name="Standard" plan_desc="For casual users." price="$3.99" pointsList={standard_plan} isCurrentPlan={false}/>
            <PricingPageCard plan_name="Pro" plan_desc="For heavy users." price="$9.99" pointsList={pro_plan} isCurrentPlan={false}/>
        </div>
    )
}