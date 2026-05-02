import React from 'react';
import { Sparkles, Globe, FileText, WandSparkles } from 'lucide-react';
import { Badge, Button, Card, Flex, Heading, Separator, Text, Theme } from '@radix-ui/themes';
import PageCard from '../components/PageCard/PageCard';
import { useSettingsStore } from '../stores/settingsStore';
import '../FrontPage.css';

interface FrontPageProps {
  onClickGenerate: () => void;
}

const QUICK_STEPS = [
  {
    icon: Globe,
    text: 'Open a page you want to summarize.',
  },
  {
    icon: Sparkles,
    text: 'Press generate in the top menu.',
  },
  {
    icon: FileText,
    text: 'Read, adjust style, and copy your result.',
  },
];

const FrontPage: React.FC<FrontPageProps> = ({ onClickGenerate }) => {
  const theme = useSettingsStore((state) => state.theme);

  return (
    <section className="front-page-shell relative flex-1 min-h-0 h-full p-3 overflow-hidden">
      <Theme
        appearance={theme === 'dark' ? 'dark' : 'light'}
        accentColor="teal"
        grayColor="slate"
        radius="large"
        hasBackground={false}
        className="front-page-theme h-full"
      >
        <PageCard id="front-page-card" as="div" className="relative z-10 h-full p-4 font-noto">
          <Flex id="front-page-content" direction="column" gap="3">
            <Flex id="front-page-badge-row" justify="center">
              <Badge color="teal" radius="full" variant="soft" className="front-badge">
                Welcome Back
              </Badge>
            </Flex>

            <Heading
              as="h1"
              size="6"
              align="center"
              wrap="balance"
              weight="bold"
              className="front-heading"
            >
              Turn any page into a clear summary
            </Heading>

            <Text
              as="p"
              size="2"
              color="gray"
              align="center"
              className="front-description"
            >
              Choose your format in Settings, then generate concise notes designed for quick reading.
            </Text>

            <Button
              type="button"
              onClick={onClickGenerate}
              size="3"
              variant="solid"
              color="teal"
              highContrast
              className="front-generate-btn"
            >
              <WandSparkles size={14} />
              Generate Summary
            </Button>

            <Separator size="4" className="front-divider" />

            <Flex id="front-page-steps" direction="column" gap="2" className="front-steps">
              {QUICK_STEPS.map(({ icon: Icon, text }, index) => (
                <Card id={`front-step-card-${index}`} key={text} size="1" className="front-step-row">
                  <Flex id={`front-step-row-${index}`} align="center" gap="2">
                    <span id={`front-step-icon-${index}`} className="front-step-icon">
                      <Icon size={13} />
                    </span>
                    <Text id={`front-step-text-${index}`} as="p" size="1" className="front-step-text">
                      {text}
                    </Text>
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Flex>
        </PageCard>
      </Theme>
    </section>
  );
};

export default FrontPage;
