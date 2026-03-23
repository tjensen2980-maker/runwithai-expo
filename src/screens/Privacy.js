// src/screens/Privacy.js
// Privatlivspolitik side for RunWithAI

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../data';

export default function Privacy({ onBack }) {
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Text style={s.backBtnText}>← Tilbage</Text>
          </TouchableOpacity>
        )}

        <Text style={s.title}>Privatlivspolitik</Text>
        <Text style={s.updated}>Sidst opdateret: Marts 2026</Text>

        <Text style={s.intro}>
          Hos RunWithAI tager vi dit privatliv alvorligt. Denne politik beskriver, hvordan vi indsamler, bruger og beskytter dine personlige oplysninger.
        </Text>

        <Text style={s.sectionTitle}>1. Dataansvarlig</Text>
        <Text style={s.paragraph}>
          RunWithAI er ansvarlig for behandlingen af dine personoplysninger. Har du spørgsmål, kan du kontakte os på: privacy@runwithai.app
        </Text>

        <Text style={s.sectionTitle}>2. Hvilke data indsamler vi?</Text>
        <Text style={s.paragraph}>Vi indsamler følgende typer data:</Text>
        <Text style={s.listItem}>• <Text style={s.bold}>Kontooplysninger:</Text> Email, navn, alder, køn</Text>
        <Text style={s.listItem}>• <Text style={s.bold}>Fysiske data:</Text> Vægt, højde (valgfrit)</Text>
        <Text style={s.listItem}>• <Text style={s.bold}>Træningsdata:</Text> Løbeaktiviteter, distance, tempo, puls, GPS-ruter</Text>
        <Text style={s.listItem}>• <Text style={s.bold}>App-brug:</Text> Præferencer, mål, niveau</Text>
        <Text style={s.listItem}>• <Text style={s.bold}>Betalingsinfo:</Text> Håndteres sikkert via Stripe</Text>

        <Text style={s.sectionTitle}>3. Hvordan bruger vi dine data?</Text>
        <Text style={s.paragraph}>Vi bruger dine data til at:</Text>
        <Text style={s.listItem}>• Levere personlige træningsplaner via AI</Text>
        <Text style={s.listItem}>• Analysere din træning og fremskridt</Text>
        <Text style={s.listItem}>• Forbedre vores tjenester</Text>
        <Text style={s.listItem}>• Sende relevante notifikationer og opdateringer</Text>
        <Text style={s.listItem}>• Håndtere betalinger og abonnementer</Text>

        <Text style={s.sectionTitle}>4. Integration med tredjeparter</Text>
        <Text style={s.paragraph}>
          RunWithAI kan integrere med Garmin Connect for at importere dine løbedata. 
          Når du forbinder din Garmin-konto, henter vi kun træningsdata — aldrig dine login-oplysninger.
        </Text>

        <Text style={s.sectionTitle}>5. Datadeling</Text>
        <Text style={s.paragraph}>
          Vi sælger aldrig dine data. Vi deler kun data med:
        </Text>
        <Text style={s.listItem}>• <Text style={s.bold}>Stripe:</Text> Til sikker betalingshåndtering</Text>
        <Text style={s.listItem}>• <Text style={s.bold}>OpenAI:</Text> Til AI-coaching (anonymiseret)</Text>
        <Text style={s.listItem}>• <Text style={s.bold}>Hosting:</Text> Vercel og Railway (data opbevaring)</Text>

        <Text style={s.sectionTitle}>6. Datasikkerhed</Text>
        <Text style={s.paragraph}>
          Vi bruger industristandarder til at beskytte dine data, herunder:
        </Text>
        <Text style={s.listItem}>• HTTPS kryptering på alle forbindelser</Text>
        <Text style={s.listItem}>• Sikker password-hashing (bcrypt)</Text>
        <Text style={s.listItem}>• JWT tokens til autentificering</Text>
        <Text style={s.listItem}>• Regelmæssige sikkerhedsopdateringer</Text>

        <Text style={s.sectionTitle}>7. Dine rettigheder</Text>
        <Text style={s.paragraph}>
          Du har ret til at:
        </Text>
        <Text style={s.listItem}>• Få adgang til dine data</Text>
        <Text style={s.listItem}>• Rette fejl i dine oplysninger</Text>
        <Text style={s.listItem}>• Slette din konto og alle data</Text>
        <Text style={s.listItem}>• Eksportere dine data (CSV)</Text>
        <Text style={s.listItem}>• Trække samtykke tilbage</Text>

        <Text style={s.sectionTitle}>8. Opbevaring af data</Text>
        <Text style={s.paragraph}>
          Vi opbevarer dine data så længe du har en aktiv konto. 
          Hvis du sletter din konto, fjernes alle dine data inden for 30 dage.
        </Text>

        <Text style={s.sectionTitle}>9. Cookies og tracking</Text>
        <Text style={s.paragraph}>
          Vi bruger minimale cookies til at holde dig logget ind. 
          Vi bruger ikke tredjepartstracking eller reklame-cookies.
        </Text>

        <Text style={s.sectionTitle}>10. Børns privatliv</Text>
        <Text style={s.paragraph}>
          RunWithAI er ikke beregnet til børn under 13 år. 
          Vi indsamler ikke bevidst data fra børn under denne alder.
        </Text>

        <Text style={s.sectionTitle}>11. Ændringer i politikken</Text>
        <Text style={s.paragraph}>
          Vi kan opdatere denne politik fra tid til anden. 
          Ved væsentlige ændringer vil vi informere dig via app eller email.
        </Text>

        <Text style={s.sectionTitle}>12. Kontakt</Text>
        <Text style={s.paragraph}>
          Har du spørgsmål om denne politik eller dine data?
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:privacy@runwithai.app')}>
          <Text style={s.link}>📧 privacy@runwithai.app</Text>
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={s.footerText}>© 2026 RunWithAI. Alle rettigheder forbeholdes.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg || '#09090b',
  },
  container: {
    padding: 24,
    paddingBottom: 60,
  },
  backBtn: {
    marginBottom: 20,
  },
  backBtnText: {
    color: colors.dim || '#666',
    fontSize: 15,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text || '#fff',
    marginBottom: 8,
  },
  updated: {
    fontSize: 13,
    color: colors.muted || '#888',
    marginBottom: 24,
  },
  intro: {
    fontSize: 16,
    color: colors.text || '#fff',
    lineHeight: 24,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accent || '#ff6b35',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: colors.text || '#fff',
    lineHeight: 22,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 15,
    color: colors.text || '#fff',
    lineHeight: 24,
    marginLeft: 8,
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
  link: {
    fontSize: 16,
    color: colors.accent || '#ff6b35',
    marginTop: 8,
  },
  footer: {
    marginTop: 48,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border || '#333',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: colors.muted || '#666',
  },
});
