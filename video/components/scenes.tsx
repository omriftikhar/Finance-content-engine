import React from 'react';
import type {Scene} from '@/lib/schemas';
import {THEME} from '../theme';
import {SafeArea, Enter, Kicker, Headline, AnimatedNumber} from './primitives';
import {Character} from './Character';
import {BarChart, LineChart, ComparisonPanel} from './charts';
import {HouseIcon, CarIcon, CreditCardIcon, DocumentIcon} from './icons';
import {interpolate, useCurrentFrame} from 'remotion';

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

/** A number that "slams" in with a scale overshoot — an expense impact. */
const ImpactNumber: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const n = scene.numbers[0];
  const scale = interpolate(frame, [0, 6, 12], [1.6, 0.94, 1], {extrapolateRight: 'clamp'});
  const shake = frame < 14 ? Math.sin(frame * 2) * (14 - frame) * 0.6 : 0;
  return (
    <div style={{transform: `scale(${scale}) translateX(${shake}px)`, textAlign: 'right'}}>
      <div style={{fontSize: 30, color: THEME.inkDim, textTransform: 'uppercase', letterSpacing: 3}}>{n?.label}</div>
      <div style={{fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 150, color: THEME.warn, letterSpacing: -4}}>
        {n ? (
          <>
            {'-'}
            <AnimatedNumber value={n.value} prefix={n.prefix} decimals={n.decimals} money={n.prefix === '$'} durationInFrames={18} />
          </>
        ) : (
          scene.headline
        )}
      </div>
    </div>
  );
};

const iconFor = (t: Scene['visualType']) => {
  switch (t) {
    case 'house':
      return <HouseIcon size={420} />;
    case 'car':
      return <CarIcon size={440} />;
    case 'creditCard':
      return <CreditCardIcon size={420} />;
    default:
      return <Character emotion="stressed" size={440} />;
  }
};

/** Expense hit: icon on the left, the cost slamming in on the right. */
const ExpenseHitScene: React.FC<{scene: Scene}> = ({scene}) => (
  <Split
    left={
      <div>
        <TextBlock scene={scene} kicker="Expense" />
      </div>
    }
    right={
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24}}>
        {iconFor(scene.visualType)}
        {scene.numbers.length > 0 && <ImpactNumber scene={scene} />}
      </div>
    }
  />
);

/** A source-document moment — builds trust by showing the paper trail. */
const SourceDocScene: React.FC<{scene: Scene}> = ({scene}) => (
  <Split
    left={<TextBlock scene={scene} kicker="Source" />}
    right={<DocumentIcon size={340} />}
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
    case 'document':
      return <SourceDocScene scene={scene} />;
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
