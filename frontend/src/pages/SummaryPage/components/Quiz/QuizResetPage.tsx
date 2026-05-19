import { useEffect, useState } from 'react'
import { ResetIcon } from '@radix-ui/react-icons'
import './QuizResetPage.css'

interface QuizResetPageProps {
    correctQuestions: number;
    totalQuestions: number;
    onClickReset: () => void;
}

const RADIUS = 45
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export const QuizResetPage = ({ correctQuestions, totalQuestions, onClickReset }: QuizResetPageProps) => {
    const [displayed, setDisplayed] = useState(0)

    useEffect(() => {
        const pct = totalQuestions > 0
            ? Math.round((correctQuestions / totalQuestions) * 100)
            : 0
        setDisplayed(pct)
    }, [correctQuestions, totalQuestions])

    const offset = CIRCUMFERENCE * (1 - displayed / 100)

    return (
        <div className="qz-reset-page">
            <section className='qz-reset-cards-section'>
                <div className='qz-reset-card'>
                    <div className='qz-ring'>
                        <svg
                            className='qz-ring-svg'
                            viewBox='0 0 100 100'
                            role='img'
                            aria-label={`Score: ${displayed}%`}
                        >
                            <circle
                                className='qz-ring-track'
                                cx='50'
                                cy='50'
                                r={RADIUS}
                            />
                            <circle
                                className={`qz-ring-progress ${displayed >= 50 ? 'stroke-green-600' : 'stroke-red-600'}`}
                                
                                cx='50'
                                cy='50'
                                r={RADIUS}
                                strokeDasharray={CIRCUMFERENCE}
                                strokeDashoffset={offset}
                            />
                        </svg>
                        <div className='qz-ring-text'>
                            <span className='qz-ring-per'>{displayed}%</span>
                            <span className='qz-ring-score'>{correctQuestions} / {totalQuestions}</span>
                        </div>
                    </div>

                    <div className='qz-ring-title'>
                        {displayed >= 50 ? <span>Great Work!</span> : <span>Nice Try!</span>}
                    </div>
                    <div className='qz-ring-desc'>
                        {displayed >= 50 ? 
                        <span>You did great! Keep that momentum going!</span>: 
                        <span>Every mistake is just a chance to learn. Reset and try again!</span>}
                    </div>
                </div>
            </section>
            <button className='qz-reset-btn' onClick={onClickReset} title='Retry quiz from the beginning'>
                <ResetIcon width={18} height={18}/>
                <span>Reset</span>
            </button>
        </div>
    )
}
