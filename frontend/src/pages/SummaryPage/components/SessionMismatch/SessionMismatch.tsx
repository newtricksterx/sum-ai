import './SessionMismatch.css'
import { ExclamationTriangleIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import '../../../../i18n';

interface SessionMismatchProps {
    sessionUrl: string;
}

export const SessionMismatch = ({ sessionUrl }: SessionMismatchProps) => {
    const { t } = useTranslation();
    return (
        <section className='sessionmismatch'>
            <div className='sessionmismatch-main'>
                <ExclamationTriangleIcon width={24} height={24} className='sessionmismatch-icon' />
                <div className='sessionmismatch-maintext'>
                    <header className='sessionmismatch-title'>{t('sessionMismatch.title')}</header>
                    <p className='sessionmismatch-desc'>
                        <span>{t('sessionMismatch.description')}</span>
                        <span className='sessionmismatch-url'>{sessionUrl}</span>
                    </p>
                </div>

            </div>
            <div className='sessionmismatch-footer'>
                <div className='sessionmismatch-tooltip'>
                    <span className=''>{t('sessionMismatch.tooltip')}</span>
                </div>
                <button>
                    <a
                    href={sessionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t('sessionMismatch.opensNewTab', { url: sessionUrl })}
                    className="return-session-btn">
                    <ExternalLinkIcon width={20} height={20}/>
                    {t('sessionMismatch.goToOriginal')}
                    </a>
                </button>

            </div>
        </section>
    )
}