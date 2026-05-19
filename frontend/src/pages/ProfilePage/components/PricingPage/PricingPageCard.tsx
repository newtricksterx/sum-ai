import PageCard from "../../../../components/PageCard/PageCard"
import './PricingPageCard.css'

export type PointDescription = {
    amount: number | "Unlimited" | null;
    desc: string;
}

interface PricingPageCardProps {
    plan_name: string;
    plan_desc: string;
    price: string;
    pointsList: PointDescription[];
    isCurrentPlan: boolean;
}

export const PricingPageCard = ({ plan_name, plan_desc, price, pointsList, isCurrentPlan } : PricingPageCardProps) => {
    return (
        <PageCard className="pricingpage-card">
            <header className="pricingpage-card-header">
                <div className="plan">
                    <span className="plan_name" >{plan_name}</span>
                    <p className="plan_desc">{plan_desc}</p>
                </div>

                <div>
                    <span className="price">{price}</span>
                    <p className="frequency">per month</p>
                </div>
                
            </header>
            <section className="points-section">
                <ul>
                    {
                        pointsList.map((point, index) => (
                            <li key={index}>{point.amount ? <strong>{point.amount}</strong> : null} {point.desc}</li>
                        ))
                    }
                </ul>
            </section>

            <a className="plan_btn">{isCurrentPlan ? "Current Plan" : "Upgrade Plan"}</a>
        </PageCard>
    )
}