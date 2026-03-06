import { MaterialIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { aboutApi, billsApi, piggyBanksApi, recurringApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

export default function ProfileScreen() {
    const router = useRouter();
    const { logout, url, biometricEnabled, setBiometric } = useAuthStore();
    const { colors: c, mode, toggleTheme } = useThemeStore();
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [serverVersion, setServerVersion] = useState('');
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [piggyCount, setPiggyCount] = useState(0);
    const [billCount, setBillCount] = useState(0);
    const [recurringCount, setRecurringCount] = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const hasHw = await LocalAuthentication.hasHardwareAsync();
                const enrolled = await LocalAuthentication.isEnrolledAsync();
                setBiometricAvailable(hasHw && enrolled);
                const [aboutRes, userRes, piggyRes, billRes, recRes] = await Promise.all([
                    aboutApi.get().catch(() => null), aboutApi.user().catch(() => null),
                    piggyBanksApi.list().catch(() => null), billsApi.list().catch(() => null),
                    recurringApi.list().catch(() => null),
                ]);
                if (aboutRes?.data?.data) setServerVersion(aboutRes.data.data.version || '');
                if (userRes?.data?.data) {
                    setUserName(userRes.data.data.attributes?.email?.split('@')[0] || 'Utente');
                    setUserEmail(userRes.data.data.attributes?.email || '');
                }
                if (piggyRes?.data?.data) setPiggyCount(piggyRes.data.data.length);
                if (billRes?.data?.data) setBillCount(billRes.data.data.length);
                if (recRes?.data?.data) setRecurringCount(recRes.data.data.length);
            } catch (e) { console.error(e); }
        })();
    }, []);

    const handleLogout = () => {
        Alert.alert('Esci', 'Sei sicuro di voler uscire? Dovrai reinserire le credenziali.', [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Esci', style: 'destructive', onPress: async () => { await logout(); router.replace('/setup'); } },
        ]);
    };
    const host = url ? url.replace('https://', '').replace('http://', '') : 'Non configurato';

    const MENU_ITEMS = [
        { icon: 'savings', label: 'Salvadanai', count: piggyCount, route: '/piggy-banks' },
        { icon: 'receipt-long', label: 'Bollette e Spese', count: billCount, route: '/bills' },
        { icon: 'sync', label: 'Ricorrenze', count: recurringCount, route: '/recurring' },
        { icon: 'bar-chart', label: 'Report e Analisi', route: '/reports' },
    ];

    const MenuRow = ({ icon, label, right, onPress, border = false }: any) => (
        <TouchableOpacity onPress={onPress} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12 }, border && { borderTopWidth: 1, borderTopColor: c.border }]}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name={icon} size={22} color={c.primary} />
            </View>
            <Text style={{ color: c.text, fontSize: 14, fontWeight: '500', flex: 1 }}>{label}</Text>
            {right}
            <MaterialIcons name="chevron-right" size={20} color={c.textMuted} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
            <View style={{ backgroundColor: c.bgCard, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>Impostazioni</Text>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Profile Card */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.bgCard, margin: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialIcons name="person" size={32} color={c.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>{userName || 'Utente'}</Text>
                        <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 2 }}>{userEmail || host}</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/setup')}>
                        <MaterialIcons name="edit" size={20} color={c.primary} />
                    </TouchableOpacity>
                </View>

                {/* Features */}
                <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                    <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 }}>FUNZIONALITÀ</Text>
                    <View style={{ backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
                        {MENU_ITEMS.map((item, i) => (
                            <MenuRow key={item.label} icon={item.icon} label={item.label} border={i > 0} onPress={() => router.push(item.route as any)}
                                right={item.count !== undefined ? <View style={{ backgroundColor: c.bgSecondary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 4 }}><Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '700' }}>{item.count}</Text></View> : null} />
                        ))}
                    </View>
                </View>

                {/* Security */}
                <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                    <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 }}>SICUREZZA</Text>
                    <View style={{ backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                                <MaterialIcons name="fingerprint" size={22} color={c.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: c.text, fontSize: 14, fontWeight: '500' }}>Biometria</Text>
                                <Text style={{ color: c.textSecondary, fontSize: 11, marginTop: 2 }}>{biometricAvailable ? 'Sblocco con impronta o volto' : 'Non disponibile'}</Text>
                            </View>
                            <Switch value={biometricEnabled}
                                onValueChange={async (v) => {
                                    if (v && !biometricAvailable) { Alert.alert('Non disponibile', 'Nessun sensore biometrico trovato.'); return; }
                                    if (v) { const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Conferma identità' }); if (r.success) await setBiometric(true); }
                                    else await setBiometric(false);
                                }}
                                trackColor={{ false: c.bgSecondary, true: c.primary }}
                                thumbColor={biometricEnabled ? 'white' : c.textMuted}
                                disabled={!biometricAvailable} />
                        </View>
                    </View>
                </View>

                {/* Server Info */}
                <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                    <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 }}>SERVER</Text>
                    <View style={{ backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="cloud" size={22} color={c.primary} /></View>
                            <View style={{ flex: 1 }}><Text style={{ color: c.text, fontSize: 14, fontWeight: '500' }}>Istanza</Text><Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 2 }}>{host}</Text></View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12, borderTopWidth: 1, borderTopColor: c.border }}>
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="info" size={22} color={c.primary} /></View>
                            <View style={{ flex: 1 }}><Text style={{ color: c.text, fontSize: 14, fontWeight: '500' }}>Versione</Text><Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 2 }}>{serverVersion || 'N/A'}</Text></View>
                        </View>
                    </View>
                </View>

                {/* Preferences */}
                <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                    <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 }}>PREFERENZE</Text>
                    <View style={{ backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
                        {/* Theme Toggle */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                                <MaterialIcons name={mode === 'dark' ? 'dark-mode' : 'light-mode'} size={22} color={c.primary} />
                            </View>
                            <Text style={{ color: c.text, fontSize: 14, fontWeight: '500', flex: 1 }}>Tema</Text>
                            <Text style={{ color: c.textSecondary, fontSize: 13, marginRight: 8 }}>{mode === 'dark' ? 'Scuro' : 'Chiaro'}</Text>
                            <Switch value={mode === 'light'}
                                onValueChange={() => toggleTheme()}
                                trackColor={{ false: c.bgSecondary, true: c.primary }}
                                thumbColor="white" />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12, borderTopWidth: 1, borderTopColor: c.border }}>
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                                <MaterialIcons name="language" size={22} color={c.primary} />
                            </View>
                            <Text style={{ color: c.text, fontSize: 14, fontWeight: '500', flex: 1 }}>Lingua</Text>
                            <Text style={{ color: c.textSecondary, fontSize: 13 }}>Italiano</Text>
                            <MaterialIcons name="chevron-right" size={18} color={c.textMuted} />
                        </View>
                    </View>
                </View>

                {/* Logout */}
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 16, backgroundColor: c.danger + '14', borderWidth: 1, borderColor: c.danger + '33', borderRadius: 14, paddingVertical: 16 }} onPress={handleLogout}>
                    <MaterialIcons name="logout" size={20} color={c.danger} />
                    <Text style={{ color: c.danger, fontSize: 15, fontWeight: '700' }}>Esci</Text>
                </TouchableOpacity>
                <Text style={{ color: c.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 24 }}>Made with ❤️ for Firefly III</Text>
            </ScrollView>
        </SafeAreaView>
    );
}
