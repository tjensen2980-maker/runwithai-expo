import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors } from '../data';

export default function Privacy({ onBack }) {
  const { t } = useTranslation();
  const sections = t('privacyPage.sections', { returnObjects: true });

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Text style={s.backBtnText}>← {t('common.back')}</Text>
          </TouchableOpacity>
        )}

        <Text style={s.title}>{t('privacyPage.title')}</Text>
        <Text style={s.updated}>{t('privacyPage.updated')}</Text>
        <Text style={s.intro}>{t('privacyPage.intro')}</Text>

        {Array.isArray(sections) && sections.map((section, index) => (
          <View key={index}>
            <Text style={s.sectionTitle}>{index + 1}. {section.title}</Text>
            {(section.paragraphs || []).map((paragraph, paragraphIndex) => (
              <Text key={paragraphIndex} style={s.paragraph}>{paragraph}</Text>
            ))}
            {(section.bullets || []).map((bullet, bulletIndex) => (
              <Text key={bulletIndex} style={s.listItem}>• {bullet}</Text>
            ))}
          </View>
        ))}

        <Text style={s.paragraph}>{t('privacyPage.contactQuestion')}</Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:privacy@runwithai.app')}>
          <Text style={s.link}>📧 privacy@runwithai.app</Text>
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={s.footerText}>{t('privacyPage.footer')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg || '#09090b' },
  container: { padding: 24, paddingBottom: 60 },
  backBtn: { marginBottom: 20 },
  backBtnText: { color: colors.dim || '#666', fontSize: 15 },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.text || '#fff', marginBottom: 8 },
  updated: { fontSize: 13, color: colors.muted || '#888', marginBottom: 24 },
  intro: { fontSize: 16, color: colors.text || '#fff', lineHeight: 24, marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.accent || '#ff6b35', marginTop: 24, marginBottom: 12 },
  paragraph: { fontSize: 15, color: colors.text || '#fff', lineHeight: 22, marginBottom: 12 },
  listItem: { fontSize: 15, color: colors.text || '#fff', lineHeight: 24, marginLeft: 8, marginBottom: 4 },
  link: { fontSize: 16, color: colors.accent || '#ff6b35', marginTop: 8 },
  footer: { marginTop: 48, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border || '#333', alignItems: 'center' },
  footerText: { fontSize: 13, color: colors.muted || '#666' },
});
