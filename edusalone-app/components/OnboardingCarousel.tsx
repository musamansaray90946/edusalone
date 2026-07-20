import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useRef, useState } from 'react';
import {
    Dimensions, FlatList, Image, Platform, StatusBar,
    StyleSheet, Text, TouchableOpacity, View
} from 'react-native';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = 'edusalone_onboarding_done';

// ─── Slide data ───────────────────────────────────────────────
const slides = [
  {
    id: '1',
    chip: 'PALMTECH GROUP LTD.',
    title: 'Built for\nSierra Leone\'s',
    titleBlue: 'schools.',
    sub: 'Every student deserves a school\nthat runs with confidence.',
    type: 'photo',
  },
  {
    id: '2',
    chip: 'FOR PRINCIPALS & OWNERS',
    title: 'Your school,\nalways in',
    titleBlue: 'your hands.',
    sub: 'Everything a principal needs —\none app, any device, anywhere.',
    type: 'stats',
    stats: [
      { num: '4', label: 'Role-based\ndashboards' },
      { num: '100%', label: 'Sierra Leone\ncurriculum' },
      { num: 'PDF', label: 'Auto report\ncards' },
      { num: 'Live', label: 'Real-time\ngrades' },
    ],
    quote: '"Finally, a school system that understands how we work in Sierra Leone."',
  },
  {
    id: '3',
    chip: 'FOR TEACHERS & STAFF',
    title: 'Save hours\nevery single',
    titleBlue: 'week.',
    sub: 'Stop managing paper. Start teaching.',
    type: 'features',
    features: [
      { icon: '📋', title: 'Mark the register in seconds', sub: 'Attendance tracked digitally, every day' },
      { icon: '📊', title: 'Enter grades from your phone', sub: 'JSS and SS grading — auto-calculated' },
      { icon: '💬', title: 'Message parents and staff', sub: 'EduChat — secure messaging inside the app' },
      { icon: '🖨️', title: 'Generate PDF report cards', sub: 'Print-ready, every term, for every student' },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────
export default function OnboardingCarousel({ onDone }: { onDone: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onDone();
  }

  function next() {
    if (activeIndex < slides.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
      setActiveIndex(activeIndex + 1);
    } else {
      finish();
    }
  }

  function renderSlide({ item }: { item: typeof slides[0] }) {
    return (
      <View style={styles.slide}>
        <StatusBar barStyle="light-content" backgroundColor="#0A2540" />

        {/* SLIDE 1 — photo hero */}
        {item.type === 'photo' && (
          <Image
            source={require('../assets/images/onboarding-hero.png')}
            style={styles.heroPhoto}
            resizeMode="cover"
          />
        )}

        {/* SLIDE 2 — stats */}
        {item.type === 'stats' && item.stats && (
          <View style={styles.statsWrap}>
            <View style={styles.statsGrid}>
              {item.stats.map((s, i) => (
                <View key={i} style={[styles.statCard, i % 2 === 0 && styles.statCardAccent]}>
                  <Text style={[styles.statNum, i % 2 === 0 && styles.statNumBlue]}>{s.num}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            {item.quote && (
              <View style={styles.quoteBox}>
                <Text style={styles.quoteText}>{item.quote}</Text>
                <Text style={styles.quoteAuthor}>— EduSalone pilot school</Text>
              </View>
            )}
          </View>
        )}

        {/* SLIDE 3 — features */}
        {item.type === 'features' && item.features && (
          <View style={styles.featuresWrap}>
            {item.features.map((f, i) => (
              <View key={i} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureSub}>{f.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Text content */}
        <View style={styles.textWrap}>
          <View style={styles.accentBar} />
          <View style={styles.chip}>
            <Text style={styles.chipText}>{item.chip}</Text>
          </View>
          <Text style={styles.title}>
            {item.title + '\n'}
            <Text style={styles.titleBlue}>{item.titleBlue}</Text>
          </Text>
          <Text style={styles.sub}>{item.sub}</Text>
        </View>

        {/* Dots + CTA */}
        <View style={styles.bottom}>
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
            ))}
          </View>
          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.btnGo} onPress={next} activeOpacity={0.85}>
              <Text style={styles.btnGoText}>
                {activeIndex === slides.length - 1 ? 'Get started →' : 'Next →'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={finish} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.btnSkip}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      ref={flatRef}
      data={slides}
      keyExtractor={(s) => s.id}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      scrollEnabled={false}
      renderItem={renderSlide}
      getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
    />
  );
}

// ─── Check if already seen ────────────────────────────────────
export async function hasSeenOnboarding(): Promise<boolean> {
  const val = await AsyncStorage.getItem(ONBOARDING_KEY);
  return val === 'true';
}

// ─── Styles ───────────────────────────────────────────────────
const NAVY = '#1A365D';
const DARK = '#0A2540';
const BLUE = '#63B3ED';
const LIGHTBLUE = '#90CDF4';
const TEXTBLUE = '#BEE3F8';

const styles = StyleSheet.create({
  slide: {
    width,
    minHeight: height,
    backgroundColor: DARK,
    paddingTop: Platform.OS === 'android' ? 40 : 54,
  },
  heroPhoto: {
    width: '100%' as any,
    height: height * 0.42,
  },
  statsWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '47%' as any,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 14,
  },
  statCardAccent: {
    backgroundColor: 'rgba(99,179,237,0.12)',
    borderColor: 'rgba(99,179,237,0.3)',
  },
  statNum: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statNumBlue: {
    color: BLUE,
  },
  statLabel: {
    fontSize: 11,
    color: LIGHTBLUE,
    marginTop: 4,
    fontWeight: '600',
  },
  quoteBox: {
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    paddingLeft: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  quoteText: {
    fontSize: 12,
    color: TEXTBLUE,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  quoteAuthor: {
    fontSize: 11,
    color: BLUE,
    fontWeight: '700',
    marginTop: 4,
  },
  featuresWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(99,179,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  featureSub: {
    fontSize: 11,
    color: LIGHTBLUE,
    marginTop: 2,
  },
  textWrap: {
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  accentBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: BLUE,
    marginBottom: 12,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99,179,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,179,237,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  chipText: {
    color: LIGHTBLUE,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    marginBottom: 10,
  },
  titleBlue: {
    color: BLUE,
  },
  sub: {
    color: TEXTBLUE,
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.9,
  },
  bottom: {
    paddingHorizontal: 22,
    paddingBottom: 36,
    marginTop: 'auto' as any,
  },
  dots: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  dot: {
    height: 7,
    width: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 22,
    backgroundColor: '#FFFFFF',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  btnGo: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnGoText: {
    color: NAVY,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  btnSkip: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
  },
});