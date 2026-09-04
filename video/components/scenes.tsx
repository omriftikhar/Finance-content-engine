import React from 'react';
import type {Scene} from '@/lib/schemas';
import {THEME} from '../theme';
import {SafeArea, Enter, Kicker, Headline, AnimatedNumber} from './primitives';
import {Character} from './Character';
import {BarChart, LineChart, ComparisonPanel} from './charts';

/** Two-column layout: text left, visual right. */
const Split: React.FC<{left: React.ReactNode; right: React.ReactNode}> = ({left, right}) => (
  <SafeArea style={{flexDirection: 'row', alignItems: 'center', gap: 80}}>
    <div style={{flex: 1}}>{left}</div>
    <div style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>{right}</div>
  </SafeArea>
);

const TextBlock: React.FC<{scene: Scene; kicker?: string}> = ({scene, kicker}) => (
  <>
    {kicker && (
      <Enter>
        <Kicker>{kicker}</Kicker>
      </Enter>
    )}
    <Enter delay={4}>
      <div style={{marginTop: 18}}>
        <Headline>{scene.headline}</Headline>
      </div>
    </Enter>
    {scene.supportingText && (
      <Enter delay={10}>
        <div style={{fontSize: 40, color: THEME.inkDim, marginTop: 28, maxWidth: 760, lineHeight: 1.35}}>
          {scene.supportingText}
        </div>
      </Enter>
    )}
  </>
);

/** Big centered number/counter. */
const NumbersScene: React.FC<{scene: Scene}> = ({scene}) => {
  const n = scene.numbers[0];
  return (
    <SafeArea style={{justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
      <Enter>
        <Kicker>{scene.headline}</Kicker>
      </Enter>
      <Enter delay={4}>
        <div style={{fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 200, letterSpacing: -6, marginTop: 20}}>
          {n ? (
            <AnimatedNumber
              value={n.value}
              prefix={n.prefix}
              suffix={n.suffix}
              decimals={n.decimals}
              money={n.prefix === '$'}
            />
          ) : (
            scene.headline
          )}
        </div>
      </Enter>
      {scene.supportingText && (
        <Enter delay={12}>
          <div style={{fontSize: 44, color: THEME.inkDim, marginTop: 12}}>{scene.supportingText}</div>
        </Enter>
      )}
    </SafeArea>
  );
};

const ExpenseHitScene: React.FC<{scene: Scene}> = ({scene}) => (
  <Split
    left={<TextBlock scene={scene} kicker="Expense" />}
    right={<Character emotion={scene.characterEmotion ?? 'stressed'} size={460} />}
  />
);

const ProgressiveList: React.FC<{scene: Scene}> = ({scene}) => {
  const items = [scene.supportingText, ...scene.chartData.map((c) => c.label)].filter(Boolean);
  return (
    <SafeArea style={{justifyContent: 'center'}}>
      <Enter>
        <Kicker>{scene.headline}</Kicker>
      </Enter>
      <div style={{marginTop: 30, display: 'flex', flexDirection: 'column', gap: 20}}>
        {items.map((item, i) => (
          <Enter key={item + i} delay={6 + i * 8}>
            <div style={{display: 'flex', alignItems: 'center', gap: 20, fontSize: 46}}>
              <span style={{color: THEME.accent, fontFamily: THEME.fontMono}}>{String(i + 1).padStart(2, '0')}</span>
              <span>{item}</span>
            </div>
          </Enter>
        ))}
      </div>
    </SafeArea>
  );
};

export const SceneRenderer: React.FC<{scene: Scene}> = ({scene}) => {
  switch (scene.visualType) {
    case 'character':
      return (
        <Split
          left={<TextBlock scene={scene} kicker={scene.character ?? 'Character'} />}
          right={<Character emotion={scene.characterEmotion ?? 'neutral'} size={480} />}
        />
      );
    case 'salaryCounter':
    case 'animatedNumber':
    case 'numbers' as Scene['visualType']:
      return <NumbersScene scene={scene} />;
    case 'expenseHit':
    case 'house':
    case 'car':
    case 'creditCard':
      return <ExpenseHitScene scene={scene} />;
    case 'barChart':
      return (
        <SafeArea style={{justifyContent: 'center'}}>
          <TextBlock scene={scene} kicker="Breakdown" />
          <div style={{marginTop: 40}}>
            <BarChart data={scene.chartData} />
          </div>
        </SafeArea>
      );
    case 'lineChart':
    case 'investmentGrowth':
      return (
        <SafeArea style={{justifyContent: 'center'}}>
          <TextBlock scene={scene} kicker="Over time" />
          <div style={{marginTop: 40}}>
            <LineChart data={scene.chartData} />
          </div>
        </SafeArea>
      );
    case 'comparison':
      return (
        <SafeArea style={{justifyContent: 'center'}}>
          <Enter>
            <Headline size={80}>{scene.headline}</Headline>
          </Enter>
          <div style={{marginTop: 50}}>
            <ComparisonPanel
              sides={scene.comparison.map((c) => ({label: c.label, value: c.value, caption: c.caption}))}
            />
          </div>
        </SafeArea>
      );
    case 'progressiveList':
      return <ProgressiveList scene={scene} />;
    case 'headline':
    case 'transition':
    default:
      return (
        <SafeArea style={{justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
          <TextBlock scene={scene} kicker={scene.visualType === 'transition' ? 'Up next' : undefined} />
        </SafeArea>
      );
  }
};
