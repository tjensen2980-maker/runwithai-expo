import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../data';

// ============================================================
// More.js - Catch-all menu for less-frequently used features
// PR #5: replaces direct bottom-nav access for Statistik,
// Kalender, Badges, Venner, Indstillinger etc.
// ============================================================

function MenuRow({ icon, title, subtitle, onPress, proLocked, badge }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>{title}</Text>
          {proLocked && <Text style={styles.proTag}>PRO</Text>}
          {badge && <Text style={styles.badgeTag}>{badge}</Text>}
        </View>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.rowChev}>›</Text>
    </TouchableOpacity>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export default function More({
  onNavigate,
  profile,
  isPro,
  isFree,
  onShowPricing,
}) {
  const { t } = useTranslation();

  const go = (tab) => () => {
    if (onNavigate) onNavigate(tab);
  };

  const goPro = (tab) => () => {
    if (isFree && onShowPricing) {
      onShowPricing();
      return;
    }
    if (onNavigate) onNavigate(tab);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Mere</Text>
      <Text style={styles.pageSub}>Alle dine vaerktoejer paa et sted</Text>

      <Section title="STATISTIK">
        <MenuRow
          icon="📊"
          title="Statistik"
          subtitle="Total km, bedste pace, milepaele"
          onPress={goPro('stats')}
          proLocked={isFree}
        />
      </Section>

      <Section title="SUNDHED">
        <MenuRow
          icon="🩸"
          title="Blodsukker"
          subtitle="Log og se din udvikling"
          onPress={go('bloodSugar')}
        />
        <MenuRow
          icon="🍽"
          title="Madplan"
          subtitle="AI-genereret madplan til dig"
          onPress={goPro('mealPlan')}
          proLocked={isFree}
        />
      </Section>

      <Section title="SETUP">
        <MenuRow
          icon="🎯"
          title="Maal"
          subtitle="Saet dine traeningsmaal"
          onPress={go('goals')}
        />
        <MenuRow
          icon="💉"
          title="Diabetes"
          subtitle="Insulin, maaltal, paaminnelser"
          onPress={go('diabetesSetup')}
        />
        <MenuRow
          icon="⚕️"
          title="Gastric sleeve / bypass"
          subtitle="Tilpas appen til din operation"
          onPress={go('bariatricSetup')}
        />
      </Section>

      <Section title="APP">
        <MenuRow
          icon="⚙️"
          title="Indstillinger"
          subtitle="Niveau, sprog, profil, notifikationer"
          onPress={go('settings')}
        />
        <MenuRow
          icon="🔒"
          title="Privatliv"
          subtitle="Data og dine rettigheder"
          onPress={go('privacy')}
        />
        {isFree && (
          <MenuRow
            icon="⭐"
            title="Opgrader til PRO"
            subtitle="Lås alle funktioner op"
            onPress={onShowPricing}
            badge="NY"
          />
        )}
      </Section>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 16, paddingBottom: 32 },

  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    marginTop: 4,
    marginBottom: 4,
    letterSpacing: -1,
  },
  pageSub: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 20,
  },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionBody: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowIconText: { fontSize: 20 },
  rowBody: { flex: 1 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  rowChev: { fontSize: 22, color: colors.muted, marginLeft: 8 },

  proTag: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent,
    backgroundColor: 'rgba(255, 87, 34, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  badgeTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
});
