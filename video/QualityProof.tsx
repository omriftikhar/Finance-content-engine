import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig, Series} from 'remotion';
import {THEME} from './theme';
import {Stage} from './components/primitives';
import {Character} from './components/Character';
import {Camera} from './motion/camera';
import {MoneyCounter, ExpenseImpact, KineticHeadline, MoneyTank, BankBalance, Callout} from './motion/components';
import {PhraseCaptions} from './motion/captions';
import {HouseIcon, CarIcon, CreditCardIcon} from './components/icons';

/**
 * Pilot #001 — OPENING QUALITY PROOF (~40s).
 *
 * A hand-directed cold-open, NOT a template. Follows the 0–30s beat sheet:
 * salary reveal → monthly gross → taxes drain → housing/car/other impacts →
 * balance collapse → Jack's reaction → open-loop question. Uses verified figures
 * from data/pilotResearch (gross 100k, monthly 8,333, tax ~26k, take-home ~6,126,
 * housing 2,300, car 800, other 1,600 → ~1,426 left).
 *
 * Every beat has intentful camera + motion + captions. Narration audio is the
 * per-beat Soniox files; captions are phrase-level.
 */

const NARR = 'narration/pilot-100k-broke';

// Beat = a Series.Sequence with its own narration + duration (frames @30fps).
interface Beat {
  audio?: string; // public path
  durationInFrames: number;
  render: (d: number) => React.ReactNode;
  captionText?: string;
}

const BG = ({tone = 'cool', children}: {tone?: 'cool' | 'warm'; children: React.ReactNode}) => (
  <Stage tone={tone}>{children}</Stage>
);

/** Center a node in the safe frame. */
const Center: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', ...style}}>{children}</AbsoluteFill>
);

export const QualityProof: React.FC = () => {
  const {fps} = useVideoConfig();
  const sec = (s: number) => Math.round(s * fps);

  const beats: Beat[] = [
    // 0–4s — Jack + $100,000 SALARY (wide, then push in)
    {
      audio: `${NARR}/narration-scene-1.mp3`,
      durationInFrames: sec(9.6),
      render: (d) => (
        <Camera action={{type: 'pushIn', to: 1.1, delay: sec(2)}} durationInFrames={d}>
          <BG tone="warm">
            <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: 160, gap: 60}}>
              <div style={{flex: 1}}>
                <div style={{fontSize: 30, letterSpacing: 6, color: THEME.accent, fontFamily: THEME.fontMono, marginBottom: 20}}>MEET JACK</div>
                <KineticHeadline text="$100,000 SALARY" size={128} emphasize="$100,000" />
                <div style={{marginTop: 30, fontSize: 40, color: THEME.inkDim}}>On paper, he made it.</div>
              </div>
              <div style={{flex: '0 0 auto'}}>
                <Character emotion="confident" size={460} />
              </div>
            </AbsoluteFill>
          </BG>
        </Camera>
      ),
    },
    // 4–8s — becomes $8,333 / MONTH (counter rolls up)
    {
      audio: `${NARR}/narration-scene-4.mp3`,
      durationInFrames: sec(11.9),
      render: (d) => (
        <Camera action={{type: 'punchIn', at: sec(0.4), amount: 0.08}} durationInFrames={d}>
          <BG>
            <Center>
              <div style={{fontSize: 30, letterSpacing: 6, color: THEME.inkDim, fontFamily: THEME.fontMono}}>DIVIDE BY TWELVE</div>
              <div style={{marginTop: 20}}>
                <MoneyCounter value={8333} durationInFrames={sec(1.4)} size={220} />
              </div>
              <div style={{marginTop: 10, fontSize: 44, color: THEME.inkDim}}>per month — before anything is spent</div>
            </Center>
          </BG>
        </Camera>
      ),
    },
    // 8–13s — the money tank + TAXES drain (~26k/yr → take-home)
    {
      audio: `${NARR}/narration-scene-12.mp3`,
      durationInFrames: sec(13.1),
      render: (d) => (
        <Camera action={{type: 'static'}} durationInFrames={d}>
          <BG>
            <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: 140}}>
              <MoneyTank level={0.735} fromLevel={1} label="Your paycheck" amount={6126} delay={sec(1)} height={480} />
              <div style={{display: 'flex', flexDirection: 'column', gap: 26}}>
                <ExpenseImpact label="Federal Tax" amount={13841} at={sec(1.2)} />
                <ExpenseImpact label="Payroll (FICA)" amount={7650} at={sec(2.4)} />
                <ExpenseImpact label="State + Local" amount={5000} at={sec(3.6)} />
              </div>
            </AbsoluteFill>
          </BG>
        </Camera>
      ),
    },
    // 13–17s — HOUSING hit
    {
      audio: `${NARR}/narration-scene-15.mp3`,
      durationInFrames: sec(13.1),
      render: (d) => (
        <Camera action={{type: 'shake', at: sec(1.3), intensity: 12}} durationInFrames={d}>
          <BG tone="warm">
            <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: 150, gap: 80}}>
              <div style={{flex: 1}}>
                <KineticHeadline text="HOUSING" size={120} emphasize="HOUSING" />
                <div style={{marginTop: 26, display: 'flex', alignItems: 'center', gap: 20}}>
                  <MoneyCounter value={2300} durationInFrames={sec(1)} size={92} color={THEME.warn} />
                  <span style={{fontSize: 40, color: THEME.inkDim}}>/ month</span>
                </div>
                <div style={{marginTop: 18}}><Callout text="a third of take-home" delay={sec(1.6)} /></div>
              </div>
              <div style={{flex: '0 0 auto'}}><HouseIcon size={380} /></div>
            </AbsoluteFill>
          </BG>
        </Camera>
      ),
    },
    // 17–21s — CAR + INSURANCE hit
    {
      audio: `${NARR}/narration-scene-18.mp3`,
      durationInFrames: sec(16.2),
      render: (d) => (
        <Camera action={{type: 'pushIn', to: 1.06}} durationInFrames={d}>
          <BG>
            <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: 150, gap: 80}}>
              <div style={{flex: '0 0 auto'}}><CarIcon size={420} /></div>
              <div style={{flex: 1}}>
                <KineticHeadline text="CAR + INSURANCE" size={92} />
                <div style={{marginTop: 24, display: 'flex', alignItems: 'center', gap: 20}}>
                  <MoneyCounter value={800} durationInFrames={sec(0.9)} size={84} color={THEME.warn} />
                  <span style={{fontSize: 38, color: THEME.inkDim}}>/ month</span>
                </div>
              </div>
            </AbsoluteFill>
          </BG>
        </Camera>
      ),
    },
    // 21–26s — everything else attacks; balance collapses
    {
      audio: `${NARR}/narration-scene-21.mp3`,
      durationInFrames: sec(11.9),
      render: (d) => (
        <Camera action={{type: 'punchIn', at: sec(2.2), amount: 0.1}} durationInFrames={d}>
          <BG>
            <Center>
              <div style={{fontSize: 30, letterSpacing: 5, color: THEME.inkDim, fontFamily: THEME.fontMono, marginBottom: 24}}>WHAT'S LEFT</div>
              <BankBalance value={1426} fromValue={6126} delay={sec(0.6)} />
              <div style={{marginTop: 30}}><Callout text="on a $100k salary" delay={sec(2.4)} color={THEME.warn} /></div>
            </Center>
          </BG>
        </Camera>
      ),
    },
    // 26–30s — Jack reaction + OPEN LOOP (pattern interrupt: full-screen question)
    {
      audio: `${NARR}/narration-scene-3.mp3`,
      durationInFrames: sec(13),
      captionText: 'How does a six-figure salary disappear this fast?',
      render: (d) => (
        <Camera action={{type: 'pullOut', from: 1.14, to: 1}} durationInFrames={d}>
          <BG tone="warm">
            <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 160}}>
              <div style={{marginBottom: 40}}>
                <Character emotion="stressed" size={300} />
              </div>
              <KineticHeadline text="WHERE DOES IT GO?" size={110} align="center" emphasize="GO?" />
              <div style={{marginTop: 30, fontSize: 42, color: THEME.inkDim, maxWidth: 1200}}>
                How does a six-figure salary disappear this fast?
              </div>
            </AbsoluteFill>
          </BG>
        </Camera>
      ),
    },
  ];

  return (
    <AbsoluteFill style={{backgroundColor: THEME.bg}}>
      <Series>
        {beats.map((b, i) => (
          <Series.Sequence key={i} durationInFrames={b.durationInFrames}>
            <BeatWithCaptions beat={b} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};

const BeatWithCaptions: React.FC<{beat: Beat}> = ({beat}) => {
  return (
    <AbsoluteFill>
      {beat.render(beat.durationInFrames)}
      {beat.audio ? <Audio src={staticFile(beat.audio)} /> : null}
      {/* captions come from the audio's narration; captionText overrides for the interrupt */}
      <CaptionForBeat beat={beat} />
    </AbsoluteFill>
  );
};

// Map each beat's narration text for phrase captions (from the scene narrations).
const BEAT_NARRATION: Record<string, string> = {
  'narration-scene-1': "Jack makes a hundred thousand dollars a year. Ten years ago, that number sounded like the finish line.",
  'narration-scene-4': "A hundred thousand a year sounds like eight thousand three hundred dollars a month. But that's gross.",
  'narration-scene-12': "The difference between what Jack earns and what he keeps is almost twenty-six thousand dollars a year.",
  'narration-scene-15': "Housing arrives first. In a high-cost city, rent can swallow a third of what's left.",
  'narration-scene-18': "Then the car — payment, insurance, gas, maintenance — about eight hundred dollars a month.",
  'narration-scene-21': "Which leaves Jack with roughly fourteen hundred dollars. On a hundred-thousand-dollar salary.",
  'narration-scene-3': "So where does a six-figure salary actually go, and why does it disappear this fast?",
};

const CaptionForBeat: React.FC<{beat: Beat}> = ({beat}) => {
  const key = beat.audio?.split('/').pop()?.replace('.mp3', '') ?? '';
  const text = beat.captionText ?? BEAT_NARRATION[key] ?? '';
  if (!text) return null;
  return <PhraseCaptions narration={text} maxWords={4} />;
};

export function qualityProofDuration(fps = 30): number {
  // Sum of beat durations (kept in sync with the beats array above).
  return Math.round(
    (9.6 + 11.9 + 13.1 + 13.1 + 16.2 + 11.9 + 13) * fps,
  );
}
