import './SessionMismatch.css'
import { ExclamationTriangleIcon, ExternalLinkIcon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';

interface SessionMismatchProps {
    sessionUrl: string;
}

export const SessionMismatch = ({ sessionUrl }: SessionMismatchProps) => {
    return (
        <section className='sessionmismatch'>
            <div className='sessionmismatch-main'>
                <ExclamationTriangleIcon width={20} height={20} />
                <div>
                    <header className='sessionmismatch-title'>Session loaded on a different URL</header>
                    <p className='sessionmismatch-desc'>This session was started on <span>{sessionUrl}</span>. Go there to continue it.</p>
                </div>
                
            </div>
            <div className='sessionmismatch-footer'>
                <div className='sessionmismatch-tooltip'>
                    <QuestionMarkCircledIcon width={20} height={20}/>
                    <span className=''>This session belongs to a different page.</span>
                </div>
                <button>
                    <a
                    href={sessionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`opens a new tab at: ${sessionUrl}`}
                    className="return-session-btn">
                    <ExternalLinkIcon width={20} height={20}/>
                    Go to session page
                    </a>
                </button>

            </div>
        </section>
    )
}